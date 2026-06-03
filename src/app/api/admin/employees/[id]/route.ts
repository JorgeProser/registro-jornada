// PATCH /api/admin/employees/[id] — update employee fields

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role } from "@prisma/client";

const UpdateEmployeeSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
  surname: z.string().max(100).optional(),
  role: z.nativeEnum(Role).optional(),
  department: z.string().max(100).nullable().optional(),
  position: z.string().max(100).nullable().optional(),
  nss: z.string().max(30).nullable().optional(),
  weeklyHours: z.number().int().min(1).max(60).optional(),
  password: z.string().min(8).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Solo administradores pueden editar empleados" }, { status: 403 });
  }

  const { id } = params;

  // Ensure employee belongs to same company
  const target = await prisma.user.findFirst({
    where: { id, companyId: session.user.companyId, deletedAt: null },
    select: { id: true, email: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { password, email, ...rest } = parsed.data;

  // Check new email uniqueness if changing
  if (email && email !== target.email) {
    const conflict = await prisma.user.findUnique({ where: { email } });
    if (conflict) {
      return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
    }
  }

  const updateData: Record<string, unknown> = { ...rest };
  if (email) updateData.email = email;
  if (password) updateData.passwordHash = await bcrypt.hash(password, 12);

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true, email: true, name: true, surname: true,
      role: true, department: true, position: true, nss: true,
      weeklyHours: true, createdAt: true,
    },
  });

  return NextResponse.json({ data: updated });
}
