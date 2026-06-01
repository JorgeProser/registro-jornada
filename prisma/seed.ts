// Seed: creates demo company, one manager, two employees, and sample time logs.
// Run: npm run db:seed

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays, setHours, setMinutes } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Company ──────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { cif: "A12345678" },
    update: {},
    create: {
      name: "Acme España S.L.",
      cif: "A12345678",
      address: "Calle Gran Vía 45",
      postalCode: "28013",
      city: "Madrid",
      province: "Madrid",
    },
  });
  console.log("✓ Company:", company.name);

  const hash = await bcrypt.hash("password123", 12);

  // ── Manager ──────────────────────────────────────────────
  const manager = await prisma.user.upsert({
    where: { email: "rrhh@acme.es" },
    update: {},
    create: {
      email: "rrhh@acme.es",
      name: "Laura",
      surname: "Martínez García",
      role: "MANAGER",
      companyId: company.id,
      department: "Recursos Humanos",
      position: "Directora de RRHH",
      passwordHash: hash,
      weeklyHours: 40,
    },
  });
  console.log("✓ Manager:", manager.email);

  // ── Inspector ────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: "inspector@mitramiss.gob.es" },
    update: {},
    create: {
      email: "inspector@mitramiss.gob.es",
      name: "Carlos",
      surname: "López Fernández",
      role: "INSPECTOR",
      companyId: company.id,
      department: "ITSS",
      position: "Inspector de Trabajo",
      passwordHash: hash,
      weeklyHours: 37,
    },
  });

  // ── Employees ────────────────────────────────────────────
  const employee1 = await prisma.user.upsert({
    where: { email: "ana.rodriguez@acme.es" },
    update: {},
    create: {
      email: "ana.rodriguez@acme.es",
      name: "Ana",
      surname: "Rodríguez Pérez",
      role: "EMPLOYEE",
      companyId: company.id,
      department: "Ingeniería",
      position: "Desarrolladora Senior",
      passwordHash: hash,
      weeklyHours: 40,
    },
  });

  const employee2 = await prisma.user.upsert({
    where: { email: "jose.garcia@acme.es" },
    update: {},
    create: {
      email: "jose.garcia@acme.es",
      name: "José",
      surname: "García Sánchez",
      role: "EMPLOYEE",
      companyId: company.id,
      department: "Ventas",
      position: "Account Manager",
      passwordHash: hash,
      weeklyHours: 40,
    },
  });
  console.log("✓ Employees created");

  // ── Sample time logs (last 10 working days) ──────────────
  const today = new Date();
  for (let i = 1; i <= 10; i++) {
    const day = subDays(today, i);
    if (day.getDay() === 0 || day.getDay() === 6) continue; // skip weekends

    const workDate = new Date(day.setHours(0, 0, 0, 0));
    const clockIn = setMinutes(setHours(new Date(workDate), 8), 55 + Math.floor(Math.random() * 10));
    const clockOut = setMinutes(setHours(new Date(workDate), 17), 45 + Math.floor(Math.random() * 20));

    const log = await prisma.timeLog.create({
      data: {
        userId: employee1.id,
        workDate,
        clockIn,
        clockOut,
        isActive: false,
        location: i % 3 === 0 ? "REMOTE" : "OFFICE",
        breaks: {
          create: [
            {
              type: "LUNCH",
              startTime: setMinutes(setHours(new Date(workDate), 14), 0),
              endTime: setMinutes(setHours(new Date(workDate), 15), 0),
            },
          ],
        },
      },
    });

    // Add an audit trail to one record (simulate admin correction)
    if (i === 3) {
      const originalIn = clockIn.toISOString();
      const corrected = setMinutes(setHours(new Date(workDate), 9), 0);
      await prisma.timeLog.update({
        where: { id: log.id },
        data: { adminCorrectedClockIn: corrected },
      });
      await prisma.auditTrail.create({
        data: {
          timeLogId: log.id,
          auditorId: manager.id,
          action: "CORRECT_CLOCK_IN",
          fieldChanged: "clockIn",
          oldValue: originalIn,
          newValue: corrected.toISOString(),
          justification:
            "Empleada informó que el sistema registró la entrada 5 minutos tarde por error técnico del dispositivo de fichaje.",
        },
      });
      console.log("✓ Sample audit trail created for day", i);
    }
  }

  console.log("✓ Sample time logs for employee1");

  // Today's active session for employee2
  const nowish = new Date();
  const todayStart = new Date(nowish.setHours(0, 0, 0, 0));
  await prisma.timeLog.upsert({
    where: { id: "seed-active-session" },
    update: {},
    create: {
      id: "seed-active-session",
      userId: employee2.id,
      workDate: todayStart,
      clockIn: setMinutes(setHours(new Date(), 9), 3),
      isActive: true,
      location: "OFFICE",
    },
  });
  console.log("✓ Active session for employee2");

  console.log("\n🎉 Seed complete!");
  console.log("──────────────────────────────────────────");
  console.log("Login credentials (password: password123):");
  console.log("  RRHH/Admin : rrhh@acme.es");
  console.log("  Inspector  : inspector@mitramiss.gob.es");
  console.log("  Empleada 1 : ana.rodriguez@acme.es");
  console.log("  Empleado 2 : jose.garcia@acme.es");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
