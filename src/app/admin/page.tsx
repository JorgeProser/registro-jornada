"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Navbar } from "@/components/Navbar";
import { TimeLogTable } from "@/components/TimeLogTable";
import { CorrectLogModal } from "@/components/CorrectLogModal";
import { CreateEmployeeModal } from "@/components/CreateEmployeeModal";
import type { AdminOverviewDto, EmployeeStatus, TimeLogDto } from "@/types";
import { minutesToHHMM } from "@/lib/client-utils";

interface EditRequestDto {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  fieldChanged: string;
  proposedValue: string;
  justification: string;
  reviewNote: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  requestedBy: { id: string; name: string; surname: string; username: string };
  reviewedBy: { name: string; surname: string; username: string } | null;
  timeLog: { id: string; workDate: string; effectiveClockIn: string; effectiveClockOut: string | null };
}

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
  const [exportEmployee, setExportEmployee] = useState("");
  const [editRequests, setEditRequests] = useState<EditRequestDto[]>([]);
  const [editRequestsLoading, setEditRequestsLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState<EditRequestDto | null>(null);

  const fetchOverview = useCallback(async () => {
    const res = await fetch("/api/admin/overview");
    const json = await res.json();
    setOverview(json.data);
    setLoading(false);
  }, []);

  const fetchEditRequests = useCallback(async () => {
    setEditRequestsLoading(true);
    try {
      const res = await fetch("/api/edit-requests?status=PENDING");
      const json = await res.json();
      if (res.ok) setEditRequests(json.data ?? []);
    } catch { /* silent */ } finally { setEditRequestsLoading(false); }
  }, []);

  useEffect(() => {
    fetchOverview();
    fetchEditRequests();
    const id = setInterval(fetchOverview, 30_000); // refresh every 30s
    return () => clearInterval(id);
  }, [fetchOverview, fetchEditRequests]);

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
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950">
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
          <h2 className="font-semibold text-gray-800 dark:text-slate-100 mb-4">Exportar Hoja de Horas</h2>
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
              <select className="input w-auto" id="export-employee" value={exportEmployee} onChange={(e) => setExportEmployee(e.target.value)}>
                <option value="">Todos los empleados</option>
                {overview?.employees.map((e) => (
                  <option key={e.userId} value={e.userId}>
                    {e.surname}, {e.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <ExportButton format="pdf" month={exportMonth} year={exportYear} employeeId={exportEmployee} />
              <ExportButton format="xlsx" month={exportMonth} year={exportYear} employeeId={exportEmployee} />
              <ExportButton format="csv" month={exportMonth} year={exportYear} employeeId={exportEmployee} />
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-3">
            El PDF incluye bloque de firmas (empleado y representante de la empresa) conforme a RD-ley 8/2019.
          </p>
        </div>

        {/* Edit requests */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h2 className="font-semibold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                Solicitudes de corrección
                {editRequests.length > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold">
                    {editRequests.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Peticiones pendientes de empleados para corregir sus registros</p>
            </div>
          </div>

          {editRequestsLoading ? (
            <div className="py-6 text-center text-sm text-gray-400 dark:text-slate-500">Cargando...</div>
          ) : editRequests.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-400 dark:text-slate-500">No hay solicitudes pendientes.</div>
          ) : (
            <div className="divide-y">
              {editRequests.map((req) => (
                <div key={req.id} className="px-5 py-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      <span className="font-semibold text-gray-800 dark:text-slate-100">
                        {req.requestedBy.surname}, {req.requestedBy.name}
                      </span>
                      <span className="text-gray-400 dark:text-slate-500 font-mono text-xs">{req.requestedBy.username}</span>
                      <span className="badge badge-amber">Pendiente</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      Registro del{" "}
                      <strong>{new Date(req.timeLog.workDate).toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</strong>
                      {" · "}
                      <strong>{req.fieldChanged === "clockIn" ? "Entrada" : "Salida"}</strong>
                      {" · "}
                      Actual:{" "}
                      <span className="font-mono">
                        {req.fieldChanged === "clockIn"
                          ? new Date(req.timeLog.effectiveClockIn).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
                          : req.timeLog.effectiveClockOut
                          ? new Date(req.timeLog.effectiveClockOut).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </span>
                      {" → "}
                      Propuesto:{" "}
                      <span className="font-mono font-semibold text-brand-700 dark:text-brand-400">
                        {new Date(req.proposedValue).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </p>
                    <p className="text-xs text-gray-600 dark:text-slate-400 mt-1 italic">"{req.justification}"</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                      Solicitado el {new Date(req.requestedAt).toLocaleString("es-ES")}
                    </p>
                  </div>
                  <button
                    onClick={() => setReviewTarget(req)}
                    className="shrink-0 btn-primary text-xs py-1.5 px-4"
                  >
                    Revisar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Employee list */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h2 className="font-semibold text-gray-800 dark:text-slate-100">Estado de empleados</h2>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Actualización automática cada 30s</p>
            </div>
            <button
              onClick={() => setShowCreateEmployee(true)}
              className="btn-primary text-sm"
            >
              + Nuevo empleado
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400 dark:text-slate-500">Cargando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-slate-700/40 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
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
                <h2 className="font-semibold text-gray-800 dark:text-slate-100">
                  {selectedEmployee.surname}, {selectedEmployee.name}
                </h2>
                <p className="text-xs text-gray-400 dark:text-slate-500 font-mono">{selectedEmployee.username}</p>
              </div>
              <button
                onClick={() => { setSelectedEmployee(null); setEmployeeLogs([]); }}
                className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
              >✕</button>
            </div>

            {logsLoading ? (
              <div className="py-12 text-center text-sm text-gray-400 dark:text-slate-500">Cargando registros...</div>
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
            fetchOverview();
          }}
        />
      )}

      {reviewTarget && (
        <ReviewEditRequestModal
          req={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSuccess={() => { setReviewTarget(null); fetchEditRequests(); }}
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
    return <div className="py-10 text-center text-sm text-gray-400 dark:text-slate-500">Sin registros</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 dark:bg-slate-700/40 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
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
              <tr key={log.id} className={corrected ? "bg-amber-50 dark:bg-amber-900/20" : "hover:bg-gray-50 dark:hover:bg-slate-700/30"}>
                <td className="px-4 py-3 font-medium">
                  {new Date(log.workDate).toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "2-digit" })}
                </td>
                <td className="px-4 py-3">{fmt(log.effectiveClockIn)}</td>
                <td className="px-4 py-3">{fmt(log.effectiveClockOut)}</td>
                <td className="px-4 py-3 text-right text-gray-500 dark:text-slate-400">{log.totalBreakMinutes}m</td>
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
  const colors = {
    green: { dot: "bg-success-500", text: "text-success-600 dark:text-success-500", bg: "bg-success-50 dark:bg-success-500/20", ring: "ring-success-200 dark:ring-success-500/30" },
    red:   { dot: "bg-danger-500",  text: "text-danger-600 dark:text-danger-500",  bg: "bg-danger-50 dark:bg-danger-500/20",  ring: "ring-danger-200 dark:ring-danger-500/30" },
    gray:  { dot: "bg-slate-300 dark:bg-slate-500", text: "text-slate-500 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-700/40", ring: "ring-slate-200 dark:ring-slate-600" },
  }[dot];
  return (
    <div className="card p-5">
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${colors.bg} ring-1 ${colors.ring} mb-3`}>
        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} ${dot === "green" ? "animate-pulse" : ""}`} />
        <span className={`text-[10px] font-bold uppercase tracking-wider ${colors.text}`}>{sub}</span>
      </div>
      <p className="text-3xl font-bold text-slate-900 dark:text-white font-mono">{value}</p>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1.5">{label}</p>
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
    <tr className={`hover:bg-gray-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors ${isSelected ? "bg-brand-50 dark:bg-brand-900/30" : ""}`} onClick={onSelect}>
      <td className="px-4 py-3">
        <p className="font-medium">{emp.surname}, {emp.name}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 font-mono">{emp.username}</p>
      </td>
      <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{emp.department ?? "—"}</td>
      <td className="px-4 py-3">
        {emp.isActive ? (
          <div>
            <span className="badge badge-green">● Activo</span>
            {emp.location && (
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">{locationEs(emp.location)}</p>
            )}
          </div>
        ) : (
          <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">Fuera</span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm">{minutesToHHMM(emp.todayMinutes)}</td>
      <td className="px-4 py-3 text-right font-mono text-sm">{minutesToHHMM(emp.weekMinutes)}</td>
      <td className="px-4 py-3">
        {overtime ? (
          <span className="badge badge-amber">+{minutesToHHMM(emp.overtimeWeekMinutes)} extra</span>
        ) : (
          <span className="text-xs text-gray-400 dark:text-slate-500">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-brand-600 dark:text-brand-400 text-sm font-semibold">Ver →</td>
    </tr>
  );
}

function ExportButton({ format, month, year, employeeId }: { format: string; month: number; year: number; employeeId: string }) {
  const labels: Record<string, string> = { pdf: "↓ PDF", xlsx: "↓ Excel", csv: "↓ CSV" };
  const url = `/api/export?format=${format}&month=${month}&year=${year}${employeeId ? `&employeeId=${employeeId}` : ""}`;
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

function ReviewEditRequestModal({
  req,
  onClose,
  onSuccess,
}: {
  req: EditRequestDto;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [action, setAction] = useState<"approve" | "reject" | "">("");
  const [reviewNote, setReviewNote] = useState("");
  const [loading, setLoading] = useState(false);

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!action) { toast.error("Selecciona aprobar o rechazar"); return; }
    if (reviewNote.trim().length < 5) { toast.error("La nota debe tener al menos 5 caracteres"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/edit-requests/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewNote: reviewNote.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al procesar la solicitud"); return; }
      toast.success(action === "approve" ? "Corrección aprobada y aplicada" : "Solicitud rechazada");
      onSuccess();
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b dark:border-slate-700">
          <h2 className="text-lg font-semibold dark:text-white">Revisar solicitud de corrección</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {req.requestedBy.surname}, {req.requestedBy.name} ·{" "}
            {new Date(req.timeLog.workDate).toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long" })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="rounded-xl bg-gray-50 dark:bg-slate-700/50 p-4 text-sm space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">Campo</p>
                <p className="font-semibold dark:text-white">{req.fieldChanged === "clockIn" ? "Hora de entrada" : "Hora de salida"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">Valor actual</p>
                <p className="font-mono font-medium dark:text-slate-200">
                  {req.fieldChanged === "clockIn"
                    ? fmtTime(req.timeLog.effectiveClockIn)
                    : req.timeLog.effectiveClockOut ? fmtTime(req.timeLog.effectiveClockOut) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">Valor propuesto</p>
                <p className="font-mono font-semibold text-brand-700 dark:text-brand-400">{fmtTime(req.proposedValue)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">Solicitado el</p>
                <p className="dark:text-slate-300">{new Date(req.requestedAt).toLocaleString("es-ES")}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">Motivo del empleado</p>
              <p className="italic text-gray-700 dark:text-slate-300">"{req.justification}"</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAction("approve")}
              className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                action === "approve"
                  ? "bg-success-500 border-success-500 text-white"
                  : "border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-success-400"
              }`}
            >
              Aprobar
            </button>
            <button
              type="button"
              onClick={() => setAction("reject")}
              className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                action === "reject"
                  ? "bg-danger-500 border-danger-500 text-white"
                  : "border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-danger-400"
              }`}
            >
              Rechazar
            </button>
          </div>

          <div>
            <label className="label">Nota de revisión <span className="text-danger-500">*</span></label>
            <textarea
              className="input w-full resize-none"
              rows={3}
              placeholder="Motivo de la decisión (mín. 5 caracteres)"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-outline flex-1" disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={loading || !action}>
              {loading ? "Procesando..." : "Confirmar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
