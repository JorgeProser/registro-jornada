// POST /api/breaks/[id]/end — end an active break

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const breakRecord = await prisma.break.findUnique({
    where: { id: params.id },
    include: { timeLog: { select: { userId: true } } },
  });

  if (!breakRecord) {
    return NextResponse.json({ error: "Descanso no encontrado" }, { status: 404 });
  }
  if (breakRecord.timeLog.userId !== session.user.id) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }
  if (breakRecord.endTime) {
    return NextResponse.json({ error: "Este descanso ya ha finalizado" }, { status: 409 });
  }

  const updated = await prisma.break.update({
    where: { id: params.id },
    data: { endTime: new Date() },
  });

  return NextResponse.json({ data: updated });
}
