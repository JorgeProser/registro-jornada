// Run: npx ts-node --project tsconfig.seed.json prisma/fix-usernames.ts
//
// Finds users whose username contains '@' (email-format) and replaces it
// with the NAMESURNAME format derived from their name + surname fields.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function makeUsername(name: string, surname: string): string {
  return (name + surname)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

async function main() {
  const emailUsers = await prisma.user.findMany({
    where: { username: { contains: "@" } },
    select: { id: true, username: true, name: true, surname: true, role: true },
  });

  if (emailUsers.length === 0) {
    console.log("No users with email-based usernames found. Nothing to do.");
    return;
  }

  console.log(`Found ${emailUsers.length} user(s) with email-based usernames:\n`);

  for (const user of emailUsers) {
    const newUsername = makeUsername(user.name, user.surname);

    // Check if the target username is already taken
    const conflict = await prisma.user.findFirst({
      where: { username: newUsername, id: { not: user.id } },
    });

    let finalUsername = newUsername;
    if (conflict) {
      finalUsername = newUsername + "2";
      console.warn(
        `  CONFLICT: ${newUsername} already taken — using ${finalUsername} for ${user.username}`
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { username: finalUsername },
    });

    console.log(
      `  ${user.role.padEnd(10)} ${user.username.padEnd(40)} → ${finalUsername}`
    );
  }

  console.log("\nDone.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
