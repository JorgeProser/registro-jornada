import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const roles = await p.$queryRaw<{value:string}[]>`SELECT unnest(enum_range(NULL::"Role")) AS value`;
  console.log("Role enum in DB:", roles.map(r => r.value));

  const superadmin = await p.user.findFirst({ where: { role: "SUPERADMIN" }, select: { username: true, role: true, companyId: true } });
  console.log("SUPERADMIN user:", superadmin);

  const companies = await p.company.findMany({ select: { id: true, name: true, cif: true } });
  console.log("All companies:", companies);
}

main().catch(console.error).finally(() => p.$disconnect());
