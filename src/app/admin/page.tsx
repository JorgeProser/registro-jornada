"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { TimeLogTable } from "@/components/TimeLogTable";
import { CorrectLogModal } from "@/components/CorrectLogModal";
import { CreateEmployeeModal } from "@/components/CreateEmployeeModal";
import type { AdminOverviewDto, EmployeeStatus, TimeLogDto } from "@/types";
import { minutesToHHMM } from "@/lib/client-utils";

export default function AdminDashboard() {
  const [overview, setOverview] = useState<AdminOverviewDto | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeStatus | null>(null);
  const [employeeLogs, setEmployeeLogs] = useState<TimeLogDto[]>([]);
  const [correctLog, setCorrectLog] = useState<TimeLogDto | null>(null);
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1);
  const [exportYear, setExportYear] = useState(new Date().getFullYear());

  const fetchOverview = useCallback(async () => {
    const res = await fetch("/api/admin/overview");
    const json = await res.json();
    setOverview(json.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOverview();
    const id = setInterval(fetchOverview, 30_000); // refresh every 30s
    return () => clearInterval(id);
  }, [fetchOverview]);

  const loadEmployeeLogs = useCallback(async (userId: string) => {
    setLogsLoading(true);
    const res = await fetch(
      `/api/time-logs?userId=${userId}&month=${exportMonth}&year=${exportYear}`
    );
    const json = await res.json();
    setEmployeeLogs(json.data ?? []);
    setLogsLoading(false);
  }, [exportMonth, exportYear]);

  function selectEmployee(emp: EmployeeStatus) {
    setSelectedEmployee(emp);
    loadEmployeeLogs(emp.userId);
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">

        {/* KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            label="Empleados activos ahora"
            value={overview?.activeEmployees ?? "—"}
            sub={`de ${overview?.totalEmployees ?? "—"} totales`}
            dot="green"
          />
          <KpiCard
            label="Empleados sin fichar"
            value={overview ? overview.totalEmployees - overview.activeEmployees : "—"}
            sub="fuera de servicio"
            dot="gray"
          />
          <KpiCard
            label="Alertas horas extra"
            value={overview?.overtimeAlerts ?? "—"}
            sub="supera jornada contratada"
            dot={overview?.overtimeAlerts ? "red" : "green"}
          />
        </div>

        {/* Export panel */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Exportar Hoja de Horas</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="label">Mes</label>
              <select className="input w-auto" value={exportMonth} onChange={(e) => setExportMonth(Number(e.target.value))}>
                {["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"].map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Año</label>
              <select className="input w-auto" value={exportYear} onChange={(e) => setExportYear(Number(e.target.value))}>
                {[2022, 2023, 2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Empleado (opcional)</label>
              <select className="input w-auto" id="export-employee">
                <option value="">Todos los empleados</option>
                {overview?.employees.map((e) => (
                  <option key={e.userId} value={e.userId}>
                    {e.surname}, {e.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <ExportButton format="pdf" month={exportMonth} year={exportYear} />
              <ExportButton format="xlsx" month={exportMonth} year={exportYear} />
              <ExportButton format="csv" month={exportMonth} year={exportYear} />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            El PDF incluye bloque de firmas (empleado y representante de la empresa) conforme a RD-ley 8/2019.
          </p>
        </div>

        {/* Employee list */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h2 className="font-semibold text-gray-800">Estado de empleados</h2>
              <p className="text-xs text-gray-400 mt-0.5">Actualización automática cada 30s</p>
            </div>
            <button
              onClick={() => setShowCreateEmployee(true)}
              className="btn-primary text-sm"
            >
              + Nuevo empleado
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Cargando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3 text-left">Empleado/a</th>
                    <th className="px-4 py-3 text-left">Departamento</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-right">Hoy</th>
                    <th className="px-4 py-3 text-right">Esta semana</th>
                    <th className="px-4 py-3 text-left">Horas extra</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {overview?.employees.map((emp) => (
                    <EmployeeRow
                      key={emp.userId}
                      emp={emp}
                      onSelect={() => selectEmployee(emp)}
                      isSelected={selectedEmployee?.userId === emp.userId}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected employee detail */}
        {selectedEmployee && (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="font-semibold text-gray-800">
                  {selectedEmployee.surname}, {selectedEmployee.name}
                </h2>
                <p className="text-xs text-gray-400">{selectedEmployee.email}</p>
              </div>
              <button
                onClick={() => { setSelectedEmployee(null); setEmployeeLogs([]); }}
                className="text-gray-400 hover:text-gray-600"
              >✕</button>
            </div>

            {logsLoading ? (
              <div className="py-12 text-center text-sm text-gray-400">Cargando registros...</div>
            ) : (
              <AdminTimeLogTable
                logs={employeeLogs}
                onCorrect={(log) => setCorrectLog(log)}
              />
            )}
          </div>
        )}
      </main>

      {correctLog && (
        <CorrectLogModal
          log={correctLog}
          onClose={() => setCorrectLog(null)}
          onSuccess={() => {
            setCorrectLog(null);
            if (selectedEmployee) loadEmployeeLogs(selectedEmployee.userId);
          }}
        />
      )}

      {showCreateEmployee && (
        <CreateEmployeeModal
          onClose={() => setShowCreateEmployee(false)}
          onSuccess={() => {
            setShowCreateEmployee(false);
            fetchOverview(); // refresh employee list
          }}
        />
      )}
    </div>
  );
}

// ── Admin table with correction button ────────────────────────

function AdminTimeLogTable({
  logs,
  onCorrect,
}: {
  logs: TimeLogDto[];
  onCorrect: (log: TimeLogDto) => void;
}) {
  if (logs.length === 0) {
    return <div className="py-10 text-center text-sm text-gray-400">Sin registros</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <th className="px-4 py-3 text-left">Fecha</th>
            <th className="px-4 py-3 text-left">Entrada</th>
            <th className="px-4 py-3 text-left">Salida</th>
            <th className="px-4 py-3 text-right">Pausa</th>
            <th className="px-4 py-3 text-right">Efectivas</th>
            <th className="px-4 py-3 text-left">Estado</th>
            <th className="px-4 py-3 text-left">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {logs.map((log) => {
            const corrected = log.effectiveClockIn !== log.originalClockIn || log.effectiveClockOut !== log.originalClockOut;
            const fmt = (iso: string | null) =>
              iso ? new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "—";
            return (
              <tr key={log.id} className={corrected ? "bg-amber-50" : "hover:bg-gray-50"}>
                <td className="px-4 py-3 font-medium">
                  {new Date(log.workDate).toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "2-digit" })}
                </td>
                <td className="px-4 py-3">{fmt(log.effectiveClockIn)}</td>
                <td className="px-4 py-3">{fmt(log.effectiveClockOut)}</td>
                <td className="px-4 py-3 text-right text-gray-500">{log.totalBreakMinutes}m</td>
                <td className="px-4 py-3 text-right font-semibold">
                  {log.effectiveWorkMinutes !== null ? minutesToHHMM(log.effectiveWorkMinutes) : "—"}
                </td>
                <td className="px-4 py-3">
                  {log.isCancelled && <span className="badge badge-red">Anulado</span>}
                  {!log.isCancelled && corrected && <span className="badge badge-amber">★ Corregido</span>}
                  {!log.isCancelled && !corrected && !log.isActive && <span className="badge badge-green">OK</span>}
                  {log.isActive && <span className="badge badge-green animate-pulse">Activo</span>}
                  {!log.effectiveClockOut && !log.isActive && !log.isCancelled && (
                    <span className="badge badge-red">Sin salida</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {!log.isCancelled && (
                    <button
                      onClick={() => onCorrect(log)}
                      className="text-xs text-brand-600 hover:underline font-medium"
                    >
                      Corregir
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────

function KpiCard({
  label, value, sub, dot,
}: {
  label: string; value: number | string; sub: string; dot: "green" | "red" | "gray";
}) {
  const dotColor = { green: "bg-success-500", red: "bg-danger-500", gray: "bg-gray-300" }[dot];
  return (
    <div className="card p-5 flex items-start gap-4">
      <span className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${dotColor}`} />
      <div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-700 mt-0.5">{label}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
    </div>
  );
}

function EmployeeRow({
  emp, onSelect, isSelected,
}: {
  emp: EmployeeStatus; onSelect: () => void; isSelected: boolean;
}) {
  const overtime = emp.overtimeWeekMinutes > 0;
  return (
    <tr className={`hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? "bg-brand-50" : ""}`} onClick={onSelect}>
      <td className="px-4 py-3">
        <p className="font-medium">{emp.surname}, {emp.name}</p>
        <p className="text-xs text-gray-400">{emp.email}</p>
      </td>
      <td className="px-4 py-3 text-gray-500">{emp.department ?? "—"}</td>
      <td className="px-4 py-3">
        {emp.isActive ? (
          <div>
            <span className="badge badge-green">● Activo</span>
            {emp.location && (
              <p className="text-[11px] text-gray-400 mt-0.5">{locationEs(emp.location)}</p>
            )}
          </div>
        ) : (
          <span className="badge" style={{ background: "#f3f4f6", color: "#6b7280" }}>Fuera</span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm">{minutesToHHMM(emp.todayMinutes)}</td>
      <td className="px-4 py-3 text-right font-mono text-sm">{minutesToHHMM(emp.weekMinutes)}</td>
      <td className="px-4 py-3">
        {overtime ? (
          <span className="badge badge-amber">+{minutesToHHMM(emp.overtimeWeekMinutes)} extra</span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-brand-600 text-sm">Ver →</td>
    </tr>
  );
}

function ExportButton({ format, month, year }: { format: string; month: number; year: number }) {
  const labels: Record<string, string> = { pdf: "↓ PDF", xlsx: "↓ Excel", csv: "↓ CSV" };
  const empId = typeof document !== "undefined"
    ? (document.getElementById("export-employee") as HTMLSelectElement | null)?.value
    : "";
  const url = `/api/export?format=${format}&month=${month}&year=${year}${empId ? `&employeeId=${empId}` : ""}`;
  return (
    <a href={url} className="btn-outline text-sm" target="_blank" rel="noreferrer">
      {labels[format]}
    </a>
  );
}

function locationEs(loc: string) {
  const m: Record<string, string> = {
    OFFICE: "Oficina", REMOTE: "Teletrabajo", DISPLACEMENT: "Desplazamiento", OTHER: "Otro",
  };
  return m[loc] ?? loc;
}
