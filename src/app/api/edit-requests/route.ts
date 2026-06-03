// GET /api/edit-requests?status=PENDING|APPROVED|REJECTED|all
// SUPERADMIN only — lists employee correction requests.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const statusParam = req.nextUrl.searchParams.get("status") ?? "PENDING";
  const whereStatus =
    statusParam === "all"
      ? undefined
      : statusParam === "PENDING" || statusParam === "APPROVED" || statusParam === "REJECTED"
      ? { status: statusParam as "PENDING" | "APPROVED" | "REJECTED" }
      : { status: "PENDING" as const };

  const requests = await prisma.editRequest.findMany({
    where: whereStatus,
    orderBy: { requestedAt: "desc" },
    include: {
      requestedBy: { select: { id: true, name: true, surname: true, username: true, companyId: true } },
      reviewedBy: { select: { id: true, name: true, surname: true, username: true } },
      timeLog: {
        select: {
          id: true,
          workDate: true,
          clockIn: true,
          clockOut: true,
          adminCorrectedClockIn: true,
          adminCorrectedClockOut: true,
        },
      },
    },
  });

  const data = requests.map((r) => ({
    id: r.id,
    status: r.status,
    fieldChanged: r.fieldChanged,
    proposedValue: r.proposedValue,
    justification: r.justification,
    reviewNote: r.reviewNote,
    requestedAt: r.requestedAt.toISOString(),
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    ipAddress: r.ipAddress,
    requestedBy: r.requestedBy,
    reviewedBy: r.reviewedBy,
    timeLog: {
      id: r.timeLog.id,
      workDate: r.timeLog.workDate.toISOString().slice(0, 10),
      effectiveClockIn: (r.timeLog.adminCorrectedClockIn ?? r.timeLog.clockIn).toISOString(),
      effectiveClockOut: (r.timeLog.adminCorrectedClockOut ?? r.timeLog.clockOut)?.toISOString() ?? null,
    },
  }));

  return NextResponse.json({ data });
}
