import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "rrhh@acme.es";
  const newPassword = "password123";
  const hash = await bcrypt.hash(newPassword, 12);

  const user = await prisma.user.update({
    where: { email },
    data: { passwordHash: hash },
    select: { email: true, name: true, role: true },
  });

  console.log("✓ Password reset for:", user.email, user.name, user.role);
  console.log("  New password:", newPassword);

  // Also reset all other demo users
  const emails = [
    "inspector@mitramiss.gob.es",
    "ana.rodriguez@acme.es",
    "jose.garcia@acme.es",
  ];
  for (const e of emails) {
    await prisma.user.update({
      where: { email: e },
      data: { passwordHash: hash },
    });
    console.log("✓ Password reset for:", e);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
