// GET /api/admin/overview — live dashboard: who's active, hours, OT alerts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calcBreakMinutes,
  calcEffectiveMinutes,
  calcOvertimeMinutes,
  getWeekBounds,
  nowMadrid,
  formatMadrid,
} from "@/lib/utils";
import type { EmployeeStatus, AdminOverviewDto } from "@/types";
import { differenceInMinutes } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role === "EMPLOYEE") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const companyId =
    session.user.role === "SUPERADMIN"
      ? (req.nextUrl.searchParams.get("companyId") ?? session.user.companyId)
      : session.user.companyId;

  const now = nowMadrid();
  const { start: weekStart, end: weekEnd } = getWeekBounds(now);

  const users = await prisma.user.findMany({
    where: {
      companyId,
      role: "EMPLOYEE",
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      surname: true,
      username: true,
      department: true,
      position: true,
      weeklyHours: true,
      timeLogs: {
        where: {
          workDate: { gte: weekStart, lte: weekEnd },
          isCancelled: false,
        },
        include: { breaks: true },
      },
    },
  });

  const todayStr = formatMadrid(now, "yyyy-MM-dd");
  const statuses: EmployeeStatus[] = users.map((u) => {
    const todayLogs = u.timeLogs.filter(
      (l) => formatMadrid(new Date(l.workDate), "yyyy-MM-dd") === todayStr
    );
    const activeLog = u.timeLogs.find((l) => l.isActive);

    // Today's effective minutes
    const todayMinutes = todayLogs.reduce((acc, l) => {
      const cin = l.adminCorrectedClockIn ?? l.clockIn;
      const cout = l.adminCorrectedClockOut ?? l.clockOut;
      // For active (no clockOut), count minutes up to now
      if (!cout && l.isActive) {
        const runningMins = differenceInMinutes(now, cin);
        return acc + Math.max(0, runningMins - calcBreakMinutes(l.breaks));
      }
      return acc + (calcEffectiveMinutes(cin, cout, l.breaks) ?? 0);
    }, 0);

    // Week's effective minutes
    const weekMinutes = u.timeLogs.reduce((acc, l) => {
      const cin = l.adminCorrectedClockIn ?? l.clockIn;
      const cout = l.adminCorrectedClockOut ?? l.clockOut;
      if (!cout && l.isActive) {
        const runningMins = differenceInMinutes(now, cin);
        return acc + Math.max(0, runningMins - calcBreakMinutes(l.breaks));
      }
      return acc + (calcEffectiveMinutes(cin, cout, l.breaks) ?? 0);
    }, 0);

    const weeklyContractedMinutes = u.weeklyHours * 60;
    const overtimeWeekMinutes = calcOvertimeMinutes(weekMinutes, weeklyContractedMinutes);

    return {
      userId: u.id,
      name: u.name,
      surname: u.surname,
      username: u.username,
      department: u.department,
      position: u.position,
      isActive: !!activeLog,
      currentClockIn: activeLog
        ? (activeLog.adminCorrectedClockIn ?? activeLog.clockIn).toISOString()
        : null,
      todayMinutes,
      weekMinutes,
      weeklyContractedMinutes,
      overtimeWeekMinutes,
      location: activeLog?.location ?? null,
    };
  });

  const dto: AdminOverviewDto = {
    activeEmployees: statuses.filter((s) => s.isActive).length,
    totalEmployees: statuses.length,
    overtimeAlerts: statuses.filter((s) => s.overtimeWeekMinutes > 0).length,
    employees: statuses,
  };

  return NextResponse.json({ data: dto });
}
