// DELETE /api/superadmin/companies/[id] — delete a company and all its data

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const { id } = params;

  const company = await prisma.company.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      users: {
        select: {
          _count: { select: { timeLogs: { where: { isCancelled: false } } } },
        },
      },
    },
  });

  if (!company) {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
  }

  const totalLogs = company.users.reduce((sum, u) => sum + u._count.timeLogs, 0);
  if (totalLogs > 0) {
    return NextResponse.json(
      {
        error: `No se puede eliminar: la empresa tiene ${totalLogs} registros de jornada. La legislación española (RD-ley 8/2019) exige conservarlos 4 años.`,
      },
      { status: 422 }
    );
  }

  // Delete in dependency order
  await prisma.$transaction(async (tx) => {
    const userIds = (
      await tx.user.findMany({ where: { companyId: id }, select: { id: true } })
    ).map((u) => u.id);

    await tx.account.deleteMany({ where: { userId: { in: userIds } } });
    await tx.session.deleteMany({ where: { userId: { in: userIds } } });
    await tx.user.deleteMany({ where: { companyId: id } });
    await tx.company.delete({ where: { id } });
  });

  return NextResponse.json({ data: { deleted: true } });
}
