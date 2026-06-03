// GET  /api/time-logs   — fetch employee's own logs (or all for admin)
// POST /api/time-logs   — clock-in (employee only)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mapTimeLogToDto, nowMadrid } from "@/lib/utils";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { z } from "zod";
import { WorkLocation } from "@prisma/client";

const ClockInSchema = z.object({
  location: z.nativeEnum(WorkLocation).optional().default("OFFICE"),
  notes: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const targetUserId = searchParams.get("userId"); // admin only

  // Determine whose logs to fetch
  let userId = session.user.id;
  if (targetUserId && session.user.role !== "EMPLOYEE") {
    userId = targetUserId;
  }

  // Build date range filter
  let dateFilter = {};
  if (month && year) {
    const from = startOfMonth(new Date(Number(year), Number(month) - 1, 1));
    const to = endOfMonth(from);
    dateFilter = { workDate: { gte: from, lte: to } };
  }

  const logs = await prisma.timeLog.findMany({
    where: {
      userId,
      ...dateFilter,
      // Inspectors see everything; employees only their own (already filtered by userId)
    },
    include: {
      breaks: { orderBy: { startTime: "asc" } },
      _count: { select: { auditTrails: true } },
    },
    orderBy: { workDate: "desc" },
  });

  return NextResponse.json({ data: logs.map(mapTimeLogToDto) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Solo empleados pueden fichar" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = ClockInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date();
  const todayStart = startOfDay(nowMadrid());
  const todayEnd = endOfDay(nowMadrid());

  // Prevent double clock-in: check for active session today
  const existingActive = await prisma.timeLog.findFirst({
    where: {
      userId: session.user.id,
      isActive: true,
    },
  });
  if (existingActive) {
    return NextResponse.json(
      { error: "Ya tienes una sesión activa. Ficha la salida primero." },
      { status: 409 }
    );
  }

  // Prevent multiple clock-ins on the same calendar day
  const todayLog = await prisma.timeLog.findFirst({
    where: {
      userId: session.user.id,
      workDate: { gte: todayStart, lte: todayEnd },
      isCancelled: false,
    },
  });
  if (todayLog && todayLog.clockOut) {
    return NextResponse.json(
      { error: "Ya existe un registro completo para hoy. Contacta con RRHH si necesitas una corrección." },
      { status: 409 }
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.headers.get("x-real-ip") ?? "unknown";

  const log = await prisma.timeLog.create({
    data: {
      userId: session.user.id,
      workDate: todayStart,
      clockIn: now,
      location: parsed.data.location,
      notes: parsed.data.notes,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent")?.slice(0, 200) ?? undefined,
    },
    include: { breaks: true, _count: { select: { auditTrails: true } } },
  });

  return NextResponse.json({ data: mapTimeLogToDto(log) }, { status: 201 });
}
