// GET  /api/admin/employees — list all employees in company
// POST /api/admin/employees — create new employee account

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role } from "@prisma/client";

const CreateEmployeeSchema = z.object({
  username: z.string().min(1).max(50).toUpperCase(),
  name: z.string().min(1).max(100),
  surname: z.string().min(1).max(100),
  role: z.nativeEnum(Role).optional().default("EMPLOYEE"),
  department: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
  nss: z.string().max(30).optional(),
  weeklyHours: z.number().int().min(1).max(60).optional().default(40),
  password: z.string().min(8).optional(),
});

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role === "EMPLOYEE") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const employees = await prisma.user.findMany({
    where: { companyId: session.user.companyId, deletedAt: null },
    select: {
      id: true,
      username: true,
      name: true,
      surname: true,
      role: true,
      department: true,
      position: true,
      nss: true,
      weeklyHours: true,
      createdAt: true,
    },
    orderBy: [{ surname: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ data: employees });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Solo administradores pueden crear empleados" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { password, ...rest } = parsed.data;
  const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;

  const exists = await prisma.user.findUnique({ where: { username: rest.username } });
  if (exists) {
    return NextResponse.json({ error: "Ya existe un usuario con ese nombre de usuario" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      ...rest,
      companyId: session.user.companyId,
      passwordHash,
    },
    select: {
      id: true, username: true, name: true, surname: true,
      role: true, department: true, position: true, nss: true, weeklyHours: true, createdAt: true,
    },
  });

  return NextResponse.json({ data: user }, { status: 201 });
}
