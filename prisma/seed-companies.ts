// Run: npx ts-node --project tsconfig.seed.json prisma/seed-companies.ts
//
// Creates:
//  - SUPERADMIN user: JORGEGARCIA / Pollo123
//  - 3 companies from Excel with their employees
//  - Employee credentials: username = NAMESURNAME, password = name123

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function makeUsername(name: string, surname: string): string {
  return (name + surname)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

function makePassword(name: string) {
  return name
    .split(" ")[0]
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "") + "123";
}

// Parse "Firstname Surname1 Surname2" → { name, surname }
function parseName(fullName: string): { name: string; surname: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { name: parts[0], surname: "" };
  return { name: parts[0], surname: parts.slice(1).join(" ") };
}

async function main() {
  console.log("Seeding companies and employees...\n");

  // ── 1. SISTEMA company (placeholder for SUPERADMIN) ────────
  let sistemaCompany = await prisma.company.findFirst({
    where: { cif: "SISTEMA" },
  });
  if (!sistemaCompany) {
    sistemaCompany = await prisma.company.create({
      data: {
        name: "SISTEMA",
        cif: "SISTEMA",
        address: "—",
        postalCode: "00000",
        city: "—",
        province: "—",
      },
    });
    console.log("Created SISTEMA company");
  }

  // ── 2. SUPERADMIN user ──────────────────────────────────────
  const superUsername = makeUsername("Jorge", "García");
  const existing = await prisma.user.findUnique({ where: { username: superUsername } });
  if (!existing) {
    const hash = await bcrypt.hash("Pollo123", 12);
    await prisma.user.create({
      data: {
        username: superUsername,
        name: "Jorge",
        surname: "García",
        role: "SUPERADMIN",
        companyId: sistemaCompany.id,
        passwordHash: hash,
      },
    });
    console.log(`Created SUPERADMIN: ${superUsername} / Pollo123`);
  } else {
    console.log(`SUPERADMIN already exists: ${superUsername}`);
  }

  // ── 3. Company data ─────────────────────────────────────────
  const ADDRESS = "Avenida de Castilla, 2";
  const POSTAL  = "28830";
  const CITY    = "San Fernando de Henares";
  const PROVINCE = "Madrid";

  const companies = [
    { name: "PROMOJAEN", cif: "B82569575" },
    { name: "ESTUDIO TRIBUTARIO GARCIA", cif: "B81317588" },
    { name: "PROSER SISTEMAS MEDICOS SL", cif: "B39545678" },
  ];

  const companyIds: Record<string, string> = {};

  for (const co of companies) {
    let company = await prisma.company.findUnique({ where: { cif: co.cif } });
    if (!company) {
      company = await prisma.company.create({
        data: {
          name: co.name,
          cif: co.cif,
          address: ADDRESS,
          postalCode: POSTAL,
          city: CITY,
          province: PROVINCE,
        },
      });
      console.log(`Created company: ${co.name}`);
    } else {
      console.log(`Company already exists: ${co.name}`);
    }
    companyIds[co.name] = company.id;
  }

  // ── 4. Employee data from Excel ─────────────────────────────
  // [fullName, nss, position, companyKey, dailyHours]
  const employees: [string, string, string, string, number][] = [
    // ESTUDIO TRIBUTARIO GARCIA
    ["SANDRA GOMEZ DIAZ",       "33/10467900-05",  "Contable",          "ESTUDIO TRIBUTARIO GARCIA", 8],
    ["MACARENA NAVARRO SALIDO", "28/10379426-75",  "Contable",          "ESTUDIO TRIBUTARIO GARCIA", 8],
    ["ANDONI GONZALO",          "281507081458",    "Contable",          "ESTUDIO TRIBUTARIO GARCIA", 4],
    ["RAQUEL VARCARCEL MUNUERA","28/11311746-31",  "Contable",          "ESTUDIO TRIBUTARIO GARCIA", 8],
    // PROMOJAEN
    ["ANTONIO JIMENEZ CAPILLA", "06/00629244-73",  "Contable",          "PROMOJAEN",                 8],
    // PROSER SISTEMAS MEDICOS SL
    ["ANDONI GONZALO",          "281507081458",    "Administrativo",    "PROSER SISTEMAS MEDICOS SL", 4],
    ["OSMEL HERNANDEZ",         "331072838848",    "Ingeniero Tecnico", "PROSER SISTEMAS MEDICOS SL", 8],
    ["CAMILO ARANA",            "281604416009",    "Ingeniero Tecnico", "PROSER SISTEMAS MEDICOS SL", 8],
    ["IGNACIO GARCIA",          "51010106887",     "Ingeniero Tecnico", "PROSER SISTEMAS MEDICOS SL", 8],
    ["JUAN CARLOS",             "281646692750",    "Ingeniero Tecnico", "PROSER SISTEMAS MEDICOS SL", 8],
    ["JESUS ABRIL",             "230056771472",    "Ingeniero Tecnico", "PROSER SISTEMAS MEDICOS SL", 4],
    ["ARIEL CHAVIANO",          "31163032574",     "Ingeniero Tecnico", "PROSER SISTEMAS MEDICOS SL", 8],
  ];

  // Track used usernames to resolve duplicates (e.g. Andoni in two companies)
  const usedUsernames = new Set<string>();

  for (const [fullName, nss, position, companyKey, dailyHours] of employees) {
    const companyId = companyIds[companyKey];
    if (!companyId) {
      console.warn(`  ⚠ Company not found: ${companyKey} — skipping ${fullName}`);
      continue;
    }

    const { name, surname } = parseName(fullName);
    const weeklyHours = dailyHours * 5;

    // Resolve username uniqueness (Andoni appears in two companies)
    let username = makeUsername(name, surname);
    if (usedUsernames.has(username)) {
      username = username + "2";
    }
    usedUsernames.add(username);

    const password = makePassword(name);

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) {
      console.log(`  Already exists: ${username}`);
      continue;
    }

    const hash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        username,
        name,
        surname,
        nss: String(nss),
        position,
        weeklyHours,
        role: "EMPLOYEE",
        companyId,
        passwordHash: hash,
      },
    });
    console.log(`  Created: ${fullName} → ${username} / ${password}  [${companyKey}]`);
  }

  console.log("\nDone.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
