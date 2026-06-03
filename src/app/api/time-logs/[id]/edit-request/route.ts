// POST /api/time-logs/[id]/edit-request
// Employee submits a correction request for one of their own past records.
// The request is PENDING until a SUPERADMIN approves or rejects it.
// Every submission is logged to AuditTrail for RD-ley 8/2019 compliance.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { AuditAction } from "@prisma/client";

const RequestSchema = z.object({
  fieldChanged: z.enum(["clockIn", "clockOut"]),
  proposedValue: z.string().datetime({ message: "Debe ser una fecha y hora válida ISO 8601" }),
  justification: z
    .string()
    .min(10, "La justificación debe tener al menos 10 caracteres")
    .max(1000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Solo los empleados pueden enviar solicitudes de corrección" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo requerido" }, { status: 400 });

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { fieldChanged, proposedValue, justification } = parsed.data;

  const log = await prisma.timeLog.findUnique({ where: { id } });
  if (!log) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
  if (log.userId !== session.user.id) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }
  if (log.isActive) {
    return NextResponse.json({ error: "No se puede solicitar corrección de un registro activo" }, { status: 409 });
  }
  if (log.isCancelled) {
    return NextResponse.json({ error: "No se puede solicitar corrección de un registro anulado" }, { status: 409 });
  }
  if (fieldChanged === "clockOut" && !log.clockOut && !log.adminCorrectedClockOut) {
    return NextResponse.json({ error: "No hay hora de salida registrada que corregir" }, { status: 409 });
  }

  // Block duplicate pending request for the same field on the same log
  const existing = await prisma.editRequest.findFirst({
    where: { timeLogId: id, requestedById: session.user.id, fieldChanged, status: "PENDING" },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Ya tienes una solicitud pendiente para este campo. Espera a que el superadmin la resuelva." },
      { status: 409 }
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const currentValue = fieldChanged === "clockIn"
    ? (log.adminCorrectedClockIn ?? log.clockIn).toISOString()
    : (log.adminCorrectedClockOut ?? log.clockOut)?.toISOString() ?? null;

  const [editRequest] = await prisma.$transaction([
    prisma.editRequest.create({
      data: {
        timeLogId: id,
        requestedById: session.user.id,
        fieldChanged,
        proposedValue,
        justification: justification.trim(),
        ipAddress: ip,
      },
    }),
    prisma.auditTrail.create({
      data: {
        timeLogId: id,
        auditorId: session.user.id,
        action: AuditAction.EMPLOYEE_EDIT_REQUESTED,
        fieldChanged,
        oldValue: currentValue,
        newValue: proposedValue,
        justification: justification.trim(),
        ipAddress: ip,
      },
    }),
  ]);

  return NextResponse.json({ data: { id: editRequest.id, status: editRequest.status } }, { status: 201 });
}
