// POST /api/superadmin/employees — create employee in any company

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const CreateSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1).max(100),
  surname: z.string().max(100).default(""),
  username: z.string().min(1).max(50).toUpperCase(),
  password: z.string().min(6),
  nss: z.string().max(30).optional(),
  position: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  weeklyHours: z.number().int().min(1).max(60).default(40),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { companyId, password, ...rest } = parsed.data;

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  const exists = await prisma.user.findFirst({ where: { username: rest.username, deletedAt: null } });
  if (exists) return NextResponse.json({ error: "Ya existe un usuario con ese nombre de usuario" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { ...rest, companyId, passwordHash, role: "EMPLOYEE" },
    select: { id: true, username: true, name: true, surname: true, role: true, department: true, position: true, nss: true, weeklyHours: true },
  });

  return NextResponse.json({ data: user }, { status: 201 });
}
