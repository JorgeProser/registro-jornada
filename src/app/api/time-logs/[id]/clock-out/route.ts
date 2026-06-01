// POST /api/time-logs/[id]/clock-out — employee clocks out of their active session

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mapTimeLogToDto } from "@/lib/utils";
import { z } from "zod";

const ClockOutSchema = z.object({
  notes: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const log = await prisma.timeLog.findUnique({
    where: { id: params.id },
    include: { breaks: true, _count: { select: { auditTrails: true } } },
  });

  if (!log) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });

  // Only the owner can clock themselves out (admins use the correction endpoint)
  if (log.userId !== session.user.id) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  if (!log.isActive) {
    return NextResponse.json({ error: "Este registro ya tiene salida registrada" }, { status: 409 });
  }

  // Close any open break before clocking out
  const openBreak = log.breaks.find((b) => !b.endTime);
  if (openBreak) {
    await prisma.break.update({
      where: { id: openBreak.id },
      data: { endTime: new Date() },
    });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = ClockOutSchema.safeParse(body);

  const updated = await prisma.timeLog.update({
    where: { id: params.id },
    data: {
      clockOut: new Date(),
      isActive: false,
      notes: parsed.success && parsed.data.notes ? parsed.data.notes : log.notes,
    },
    include: { breaks: true, _count: { select: { auditTrails: true } } },
  });

  return NextResponse.json({ data: mapTimeLogToDto(updated) });
}
