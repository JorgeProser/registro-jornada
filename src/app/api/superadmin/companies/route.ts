// GET  /api/superadmin/companies — list all companies with employees
// POST /api/superadmin/companies — create company + employees in one transaction

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const EmployeeSchema = z.object({
  name: z.string().min(1).max(100),
  surname: z.string().max(100).default(""),
  username: z.string().min(1).max(50).toUpperCase(),
  password: z.string().min(6),
  nss: z.string().max(30).optional(),
  position: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  weeklyHours: z.number().int().min(1).max(60).default(40),
});

const CreateCompanySchema = z.object({
  name: z.string().min(1).max(200),
  cif: z.string().min(1).max(20),
  address: z.string().min(1).max(300),
  postalCode: z.string().min(1).max(10),
  city: z.string().min(1).max(100),
  province: z.string().min(1).max(100),
  employees: z.array(EmployeeSchema).default([]),
});

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const companies = await prisma.company.findMany({
      where: { cif: { not: "SISTEMA" } }, // exclude the SISTEMA placeholder by CIF, more reliable
      select: {
        id: true,
        name: true,
        cif: true,
        address: true,
        postalCode: true,
        city: true,
        province: true,
        createdAt: true,
        users: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            surname: true,
            username: true,
            role: true,
            department: true,
            position: true,
            nss: true,
            weeklyHours: true,
          },
          orderBy: [{ surname: "asc" }, { name: "asc" }],
        },
      },
      orderBy: { name: "asc" },
    });

    const data = companies.map((c) => ({
      id: c.id,
      name: c.name,
      cif: c.cif,
      address: c.address,
      postalCode: c.postalCode,
      city: c.city,
      province: c.province,
      createdAt: c.createdAt.toISOString(),
      employeeCount: c.users.length,
      employees: c.users,
    }));

    return NextResponse.json({ data });
  } catch (e) {
    console.error("[superadmin/companies GET]", e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateCompanySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { employees, ...companyData } = parsed.data;

  // Check CIF uniqueness
  const existingCif = await prisma.company.findUnique({ where: { cif: companyData.cif } });
  if (existingCif) {
    return NextResponse.json({ error: "Ya existe una empresa con ese CIF" }, { status: 409 });
  }

  // Check username uniqueness across all employees
  const usernames = employees.map((e) => e.username);
  const duplicateUsernames = usernames.filter((u, i) => usernames.indexOf(u) !== i);
  if (duplicateUsernames.length > 0) {
    return NextResponse.json({ error: `Nombres de usuario duplicados: ${duplicateUsernames.join(", ")}` }, { status: 409 });
  }

  const existingUsers = await prisma.user.findMany({
    where: { username: { in: usernames } },
    select: { username: true },
  });
  if (existingUsers.length > 0) {
    return NextResponse.json(
      { error: `Nombres de usuario ya en uso: ${existingUsers.map((u) => u.username).join(", ")}` },
      { status: 409 }
    );
  }

  // Create company + employees in a single transaction
  const company = await prisma.$transaction(async (tx) => {
    const newCompany = await tx.company.create({ data: companyData });

    for (const emp of employees) {
      const { password, ...empRest } = emp;
      const passwordHash = await bcrypt.hash(password, 12);
      await tx.user.create({
        data: {
          ...empRest,
          passwordHash,
          companyId: newCompany.id,
          role: "EMPLOYEE",
        },
      });
    }

    return newCompany;
  });

  return NextResponse.json({ data: { id: company.id, name: company.name } }, { status: 201 });
}
