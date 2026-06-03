import type { Role, BreakType, AuditAction, WorkLocation } from "@prisma/client";

export type { Role, BreakType, AuditAction, WorkLocation };

// ── API response shapes ─────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  details?: unknown;
}

// ── Time Log types ──────────────────────────────────────────

export interface BreakDto {
  id: string;
  type: BreakType;
  startTime: string; // ISO
  endTime: string | null;
  durationMinutes: number | null;
}

export interface TimeLogDto {
  id: string;
  userId: string;
  workDate: string; // YYYY-MM-DD
  // Effective values (admin-corrected ?? original)
  effectiveClockIn: string;
  effectiveClockOut: string | null;
  // Original immutable values
  originalClockIn: string;
  originalClockOut: string | null;
  isActive: boolean;
  isCancelled: boolean;
  location: WorkLocation;
  notes: string | null;
  breaks: BreakDto[];
  totalBreakMinutes: number;
  effectiveWorkMinutes: number | null;
  hasAuditTrail: boolean;
  createdAt: string;
}

export interface TimeLogWithUser extends TimeLogDto {
  user: {
    id: string;
    name: string;
    surname: string;
    email: string;
    department: string | null;
    position: string | null;
  };
}

// ── Audit trail types ───────────────────────────────────────

export interface AuditTrailDto {
  id: string;
  changedAt: string;
  action: AuditAction;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  justification: string;
  auditor: { name: string; surname: string; email: string };
}

// ── Admin dashboard types ───────────────────────────────────

export interface EmployeeStatus {
  userId: string;
  name: string;
  surname: string;
  email: string;
  department: string | null;
  position: string | null;
  isActive: boolean;
  currentClockIn: string | null;
  todayMinutes: number;
  weekMinutes: number;
  weeklyContractedMinutes: number;
  overtimeWeekMinutes: number;
  location: WorkLocation | null;
}

export interface AdminOverviewDto {
  activeEmployees: number;
  totalEmployees: number;
  overtimeAlerts: number;
  employees: EmployeeStatus[];
}

// ── Superadmin types ────────────────────────────────────────

export interface CompanyEmployeeDto {
  id: string;
  name: string;
  surname: string;
  email: string;
  role: string;
  department: string | null;
  position: string | null;
  nss: string | null;
  weeklyHours: number;
}

export interface CompanyDto {
  id: string;
  name: string;
  cif: string;
  address: string;
  postalCode: string;
  city: string;
  province: string;
  createdAt: string;
  employeeCount: number;
  employees: CompanyEmployeeDto[];
}

// ── Request bodies ──────────────────────────────────────────

export interface ClockInBody {
  location?: WorkLocation;
  notes?: string;
}

export interface ClockOutBody {
  notes?: string;
}

export interface AdminCorrectBody {
  fieldChanged: "clockIn" | "clockOut";
  newValue: string; // ISO datetime
  justification: string; // required, min 10 chars
}

export interface ExportQuery {
  month: number; // 1–12
  year: number;
  employeeId?: string;
  format: "pdf" | "csv" | "xlsx";
}
