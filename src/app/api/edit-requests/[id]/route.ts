// PATCH /api/edit-requests/[id]
// SUPERADMIN or MANAGER — approves or rejects an employee correction request.
// MANAGER is scoped to their company; SUPERADMIN can review any.
// Approval atomically: applies the correction to TimeLog + writes AuditTrail + closes the request.
// Rejection: closes the request + writes AuditTrail.
// All operations are append-only and fully traceable per RD-ley 8/2019.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { AuditAction } from "@prisma/client";

const ReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reviewNote: z
    .string()
    .min(5, "La nota debe tener al menos 5 caracteres")
    .max(1000),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "SUPERADMIN" && session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Sin permisos para revisar solicitudes" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo requerido" }, { status: 400 });

  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { action, reviewNote } = parsed.data;

  const editRequest = await prisma.editRequest.findUnique({
    where: { id },
    include: {
      timeLog: true,
      requestedBy: { select: { companyId: true } },
    },
  });

  if (!editRequest) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });

  if (
    session.user.role === "MANAGER" &&
    editRequest.requestedBy.companyId !== session.user.companyId
  ) {
    return NextResponse.json({ error: "Sin permisos para esta solicitud" }, { status: 403 });
  }

  if (editRequest.status !== "PENDING") {
    return NextResponse.json({ error: "Esta solicitud ya fue resuelta" }, { status: 409 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const now = new Date();

  if (action === "reject") {
    await prisma.$transaction([
      prisma.editRequest.update({
        where: { id },
        data: { status: "REJECTED", reviewedById: session.user.id, reviewedAt: now, reviewNote: reviewNote.trim() },
      }),
      prisma.auditTrail.create({
        data: {
          timeLogId: editRequest.timeLogId,
          auditorId: session.user.id,
          action: AuditAction.EMPLOYEE_EDIT_REJECTED,
          fieldChanged: editRequest.fieldChanged,
          oldValue: editRequest.proposedValue,
          newValue: null,
          justification: reviewNote.trim(),
          ipAddress: ip,
        },
      }),
    ]);

    return NextResponse.json({ data: { status: "REJECTED" } });
  }

  // Approve: apply the correction to the TimeLog
  const log = editRequest.timeLog;
  const { fieldChanged, proposedValue } = editRequest;

  let oldValue: string | null = null;
  let auditAction: AuditAction;
  let updateData: Record<string, Date | boolean> = {};

  if (fieldChanged === "clockIn") {
    oldValue = (log.adminCorrectedClockIn ?? log.clockIn).toISOString();
    auditAction = AuditAction.EMPLOYEE_EDIT_APPROVED;
    updateData = { adminCorrectedClockIn: new Date(proposedValue) };
  } else {
    const currentOut = log.adminCorrectedClockOut ?? log.clockOut;
    oldValue = currentOut?.toISOString() ?? null;
    auditAction = AuditAction.EMPLOYEE_EDIT_APPROVED;
    updateData = { adminCorrectedClockOut: new Date(proposedValue), isActive: false };
  }

  await prisma.$transaction([
    prisma.editRequest.update({
      where: { id },
      data: { status: "APPROVED", reviewedById: session.user.id, reviewedAt: now, reviewNote: reviewNote.trim() },
    }),
    prisma.timeLog.update({
      where: { id: editRequest.timeLogId },
      data: updateData,
    }),
    prisma.auditTrail.create({
      data: {
        timeLogId: editRequest.timeLogId,
        auditorId: session.user.id,
        action: auditAction,
        fieldChanged,
        oldValue,
        newValue: proposedValue,
        // Justification includes both the employee's reason and the admin's note for full traceability
        justification: `[Solicitud empleado: ${editRequest.justification}] [Nota admin: ${reviewNote.trim()}]`,
        ipAddress: ip,
      },
    }),
  ]);

  return NextResponse.json({ data: { status: "APPROVED" } });
}
