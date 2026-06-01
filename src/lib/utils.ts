import { differenceInMinutes, format, startOfWeek, endOfWeek } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { TimeLog, Break } from "@prisma/client";
import type { TimeLogDto, BreakDto } from "@/types";

const TIMEZONE = "Europe/Madrid";

// ── Time zone helpers ───────────────────────────────────────

export function nowMadrid(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

export function toMadrid(date: Date): Date {
  return toZonedTime(date, TIMEZONE);
}

export function formatMadrid(date: Date, fmt: string): string {
  return format(toMadrid(date), fmt);
}

// ── Break duration ──────────────────────────────────────────

export function calcBreakMinutes(breaks: Break[]): number {
  return breaks.reduce((acc, b) => {
    if (!b.endTime) return acc;
    return acc + differenceInMinutes(b.endTime, b.startTime);
  }, 0);
}

// ── Effective work duration ─────────────────────────────────

export function calcEffectiveMinutes(
  clockIn: Date,
  clockOut: Date | null,
  breaks: Break[]
): number | null {
  if (!clockOut) return null;
  const total = differenceInMinutes(clockOut, clockIn);
  const breakMins = calcBreakMinutes(breaks);
  return Math.max(0, total - breakMins);
}

// ── Overtime calculation (RD 8/2019) ───────────────────────
// Max ordinary work: 40h/week, 9h/day (Art. 34 ET)
// Overtime: > contracted weekly hours

export function calcOvertimeMinutes(
  weekMinutes: number,
  contractedWeeklyMinutes: number
): number {
  return Math.max(0, weekMinutes - contractedWeeklyMinutes);
}

// ── Week boundaries (Mon–Sun, Spanish standard) ─────────────

export function getWeekBounds(date: Date): { start: Date; end: Date } {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return { start, end };
}

// ── DTO mapper ──────────────────────────────────────────────

export function mapTimeLogToDto(
  log: TimeLog & { breaks: Break[]; _count?: { auditTrails: number } }
): TimeLogDto {
  const effectiveClockIn = log.adminCorrectedClockIn ?? log.clockIn;
  const effectiveClockOut = log.adminCorrectedClockOut ?? log.clockOut;
  const breakDtos: BreakDto[] = log.breaks.map((b) => ({
    id: b.id,
    type: b.type,
    startTime: b.startTime.toISOString(),
    endTime: b.endTime?.toISOString() ?? null,
    durationMinutes: b.endTime
      ? differenceInMinutes(b.endTime, b.startTime)
      : null,
  }));
  const totalBreakMinutes = calcBreakMinutes(log.breaks);
  const effectiveWorkMinutes = calcEffectiveMinutes(
    effectiveClockIn,
    effectiveClockOut,
    log.breaks
  );

  return {
    id: log.id,
    userId: log.userId,
    workDate: format(log.workDate, "yyyy-MM-dd"),
    effectiveClockIn: effectiveClockIn.toISOString(),
    effectiveClockOut: effectiveClockOut?.toISOString() ?? null,
    originalClockIn: log.clockIn.toISOString(),
    originalClockOut: log.clockOut?.toISOString() ?? null,
    isActive: log.isActive,
    isCancelled: log.isCancelled,
    location: log.location,
    notes: log.notes,
    breaks: breakDtos,
    totalBreakMinutes,
    effectiveWorkMinutes,
    hasAuditTrail: (log._count?.auditTrails ?? 0) > 0,
    createdAt: log.createdAt.toISOString(),
  };
}

// ── Format helpers ──────────────────────────────────────────

export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function classNames(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
