// GET /api/edit-requests/mine — returns the current user's own edit requests (any role)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const requests = await prisma.editRequest.findMany({
    where: { requestedById: session.user.id },
    orderBy: { requestedAt: "desc" },
    take: 20,
    include: {
      reviewedBy: { select: { name: true, surname: true } },
      timeLog: {
        select: {
          workDate: true,
          clockIn: true,
          adminCorrectedClockIn: true,
          clockOut: true,
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
    reviewedBy: r.reviewedBy,
    timeLog: {
      workDate: r.timeLog.workDate.toISOString().slice(0, 10),
      effectiveClockIn: (r.timeLog.adminCorrectedClockIn ?? r.timeLog.clockIn).toISOString(),
      effectiveClockOut: (r.timeLog.adminCorrectedClockOut ?? r.timeLog.clockOut)?.toISOString() ?? null,
    },
  }));

  return NextResponse.json({ data });
}
