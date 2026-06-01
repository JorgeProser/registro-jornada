import { PrismaClient } from "@prisma/client";

// Temporary debug — remove after fixing
const dbUrl = process.env.DATABASE_URL ?? "NOT SET";
console.log("DATABASE_URL starts with:", dbUrl.substring(0, 20));

declare global {
  // Prevent multiple Prisma instances in dev hot-reload
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
