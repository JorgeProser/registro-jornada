// PATCH  /api/superadmin/employees/[id] — edit any employee
// DELETE /api/superadmin/employees/[id] — soft-delete (has logs) or hard-delete (no logs)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role } from "@prisma/client";

const UpdateSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
  surname: z.string().max(100).optional(),
  role: z.nativeEnum(Role).optional(),
  department: z.string().max(100).nullable().optional(),
  position: z.string().max(100).nullable().optional(),
  nss: z.string().max(30).nullable().optional(),
  weeklyHours: z.number().int().min(1).max(60).optional(),
  password: z.string().min(6).optional(),
});

async function getCheckedSession(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  if (session.user.role !== "SUPERADMIN") return null;
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCheckedSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const target = await prisma.user.findFirst({ where: { id, deletedAt: null }, select: { id: true, email: true } });
  if (!target) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { password, email, ...rest } = parsed.data;

  if (email && email !== target.email) {
    const conflict = await prisma.user.findUnique({ where: { email } });
    if (conflict) return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
  }

  const updateData: Record<string, unknown> = { ...rest };
  if (email) updateData.email = email;
  if (password) updateData.passwordHash = await bcrypt.hash(password, 12);

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, email: true, name: true, surname: true, role: true, department: true, position: true, nss: true, weeklyHours: true },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCheckedSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const target = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, surname: true, _count: { select: { timeLogs: true } } },
  });
  if (!target) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });

  if (target._count.timeLogs > 0) {
    // Has time records — close any active clock-in, then soft-delete
    await prisma.$transaction([
      // Close active log if clocked in right now
      prisma.timeLog.updateMany({
        where: { userId: id, isActive: true },
        data: { isActive: false, clockOut: new Date() },
      }),
      // Soft delete
      prisma.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
    ]);
    return NextResponse.json({
      data: { deleted: "soft", message: `${target.name} ${target.surname} dado de baja. Sus registros de jornada se conservan por obligación legal.` },
    });
  } else {
    // No time records — safe to hard delete
    await prisma.$transaction(async (tx) => {
      await tx.account.deleteMany({ where: { userId: id } });
      await tx.session.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    });
    return NextResponse.json({ data: { deleted: "hard", message: `${target.name} ${target.surname} eliminado permanentemente.` } });
  }
}
