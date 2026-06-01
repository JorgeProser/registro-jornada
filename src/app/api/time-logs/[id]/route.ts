// GET   /api/time-logs/[id]         — fetch single log + audit trail
// PATCH /api/time-logs/[id]         — admin correction (creates audit record)
// DELETE /api/time-logs/[id]        — admin cancel (soft, creates audit record)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mapTimeLogToDto } from "@/lib/utils";
import { z } from "zod";
import { AuditAction } from "@prisma/client";

const CorrectSchema = z.object({
  fieldChanged: z.enum(["clockIn", "clockOut"]),
  newValue: z.string().datetime({ message: "Debe ser una fecha y hora válida ISO 8601" }),
  justification: z
    .string()
    .min(10, "La justificación debe tener al menos 10 caracteres")
    .max(1000),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const log = await prisma.timeLog.findUnique({
    where: { id: params.id },
    include: {
      breaks: { orderBy: { startTime: "asc" } },
      _count: { select: { auditTrails: true } },
      auditTrails: {
        orderBy: { changedAt: "desc" },
        include: {
          auditor: { select: { name: true, surname: true, email: true } },
        },
      },
    },
  });

  if (!log) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Employees can only see their own logs
  if (session.user.role === "EMPLOYEE" && log.userId !== session.user.id) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const dto = mapTimeLogToDto(log);
  const audits = log.auditTrails.map((a) => ({
    id: a.id,
    changedAt: a.changedAt.toISOString(),
    action: a.action,
    fieldChanged: a.fieldChanged,
    oldValue: a.oldValue,
    newValue: a.newValue,
    justification: a.justification,
    auditor: a.auditor,
  }));

  return NextResponse.json({ data: { ...dto, auditTrails: audits } });
}

// Admin correction — NEVER overwrites original; uses adminCorrected fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role === "EMPLOYEE") {
    return NextResponse.json(
      { error: "Los empleados no pueden modificar registros" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo requerido" }, { status: 400 });

  const parsed = CorrectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { fieldChanged, newValue, justification } = parsed.data;

  const log = await prisma.timeLog.findUnique({
    where: { id: params.id },
    include: { breaks: true, _count: { select: { auditTrails: true } } },
  });

  if (!log) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Determine old value and action
  let oldValue: string | null = null;
  let action: AuditAction;
  let updateData: Record<string, Date | boolean> = {};

  if (fieldChanged === "clockIn") {
    oldValue = (log.adminCorrectedClockIn ?? log.clockIn).toISOString();
    action = AuditAction.CORRECT_CLOCK_IN;
    updateData = { adminCorrectedClockIn: new Date(newValue) };
  } else {
    const currentOut = log.adminCorrectedClockOut ?? log.clockOut;
    oldValue = currentOut?.toISOString() ?? null;
    action = currentOut ? AuditAction.CORRECT_CLOCK_OUT : AuditAction.ADD_CLOCK_OUT;
    updateData = {
      adminCorrectedClockOut: new Date(newValue),
      isActive: false,
    };
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] ??
    req.headers.get("x-real-ip") ??
    "unknown";

  // Atomic: update TimeLog + create AuditTrail in a transaction
  const [updatedLog] = await prisma.$transaction([
    prisma.timeLog.update({
      where: { id: params.id },
      data: updateData,
      include: { breaks: true, _count: { select: { auditTrails: true } } },
    }),
    prisma.auditTrail.create({
      data: {
        timeLogId: params.id,
        auditorId: session.user.id,
        action,
        fieldChanged,
        oldValue,
        newValue,
        justification,
        ipAddress: ip,
      },
    }),
  ]);

  return NextResponse.json({ data: mapTimeLogToDto(updatedLog) });
}

// Soft-cancel (marks isCancelled = true, logs to audit)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Solo administradores pueden anular registros" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const justification = body?.justification as string | undefined;
  if (!justification || justification.trim().length < 10) {
    return NextResponse.json(
      { error: "Se requiere una justificación de al menos 10 caracteres para anular un registro" },
      { status: 400 }
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";

  await prisma.$transaction([
    prisma.timeLog.update({
      where: { id: params.id },
      data: { isCancelled: true, isActive: false },
    }),
    prisma.auditTrail.create({
      data: {
        timeLogId: params.id,
        auditorId: session.user.id,
        action: AuditAction.CANCEL_RECORD,
        fieldChanged: "status",
        oldValue: "active",
        newValue: "cancelled",
        justification: justification.trim(),
        ipAddress: ip,
      },
    }),
  ]);

  return NextResponse.json({ data: { cancelled: true } });
}
