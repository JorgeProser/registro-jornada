// POST /api/breaks — start a break on an active time log

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { BreakType } from "@prisma/client";

const StartBreakSchema = z.object({
  timeLogId: z.string().cuid(),
  type: z.nativeEnum(BreakType).optional().default("REST"),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "EMPLOYEE" && session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Solo empleados pueden registrar descansos" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = StartBreakSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { timeLogId, type } = parsed.data;

  // Verify the log belongs to this user and is active
  const log = await prisma.timeLog.findUnique({
    where: { id: timeLogId },
    include: { breaks: true },
  });

  if (!log || log.userId !== session.user.id) {
    return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
  }
  if (!log.isActive) {
    return NextResponse.json({ error: "No puedes iniciar un descanso en una sesión inactiva" }, { status: 409 });
  }

  // Prevent nested breaks
  const openBreak = log.breaks.find((b) => !b.endTime);
  if (openBreak) {
    return NextResponse.json(
      { error: "Ya tienes un descanso activo. Finalízalo antes de iniciar otro." },
      { status: 409 }
    );
  }

  const newBreak = await prisma.break.create({
    data: {
      timeLogId,
      type,
      startTime: new Date(),
    },
  });

  return NextResponse.json({ data: newBreak }, { status: 201 });
}
