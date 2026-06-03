"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { TimeLogTable } from "@/components/TimeLogTable";
import type { TimeLogDto } from "@/types";

// Inspector view: read-only, can query by employee and date range
export default function InspectorDashboard() {
  const [employees, setEmployees] = useState<{ id: string; name: string; surname: string; username: string }[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [logs, setLogs] = useState<TimeLogDto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/employees")
      .then((r) => r.json())
      .then((j) => setEmployees(j.data ?? []));
  }, []);

  const search = useCallback(async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    const res = await fetch(
      `/api/time-logs?userId=${selectedEmployee}&month=${month}&year=${year}`
    );
    const json = await res.json();
    setLogs(json.data ?? []);
    setLoading(false);
  }, [selectedEmployee, month, year]);

  const totalHours = logs.reduce((acc, l) => acc + (l.effectiveWorkMinutes ?? 0), 0);
  const corrected = logs.filter((l) => l.hasAuditTrail).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">

        {/* Banner */}
        <div className="rounded-xl bg-brand-900 text-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">
            Acceso Inspector de Trabajo
          </p>
          <h1 className="text-xl font-bold">Registro de Jornada — Vista de Inspección</h1>
          <p className="text-sm opacity-80 mt-1">
            Acceso de solo lectura · Real Decreto-ley 8/2019 · RGPD (UE 2016/679)
          </p>
        </div>

        {/* Filters */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Consultar registros</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="label">Empleado/a</label>
              <select
                className="input"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
              >
                <option value="">Seleccionar empleado...</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.surname}, {e.name} ({e.username})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Mes</label>
              <select className="input w-auto" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"].map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Año</label>
              <select className="input w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {[2022, 2023, 2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button
              onClick={search}
              disabled={!selectedEmployee || loading}
              className="btn-primary"
            >
              {loading ? "Buscando..." : "Consultar"}
            </button>
          </div>
        </div>

        {/* Summary */}
        {logs.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Días registrados", value: logs.filter((l) => !l.isCancelled).length },
              { label: "Total horas efectivas", value: `${Math.floor(totalHours / 60)}h ${totalHours % 60}m` },
              { label: "Registros con auditoría", value: corrected },
              { label: "Registros anulados", value: logs.filter((l) => l.isCancelled).length },
            ].map((s) => (
              <div key={s.label} className="card p-4">
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Records table */}
        {logs.length > 0 && (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-gray-800">Registros de jornada</h2>
              {selectedEmployee && (
                <a
                  href={`/api/export?format=pdf&month=${month}&year=${year}&employeeId=${selectedEmployee}`}
                  className="btn-outline text-sm"
                  target="_blank"
                  rel="noreferrer"
                >
                  ↓ Exportar PDF
                </a>
              )}
            </div>
            <TimeLogTable logs={logs} showAuditButton={true} />
          </div>
        )}

        {/* Legal footer */}
        <div className="border rounded-xl p-5 bg-white text-xs text-gray-500 space-y-1">
          <p className="font-semibold text-gray-700">Marco legal aplicable:</p>
          <p>• <strong>Real Decreto-ley 8/2019</strong>, de 8 de marzo — Obligación de registro diario de jornada</p>
          <p>• <strong>Estatuto de los Trabajadores</strong>, Art. 34 — Límites de jornada (9h/día, 40h/semana)</p>
          <p>• <strong>Ley 10/2021</strong>, de 9 de julio — Trabajo a distancia (teletrabajo)</p>
          <p>• <strong>RGPD (UE) 2016/679</strong> y <strong>LOPDGDD</strong> — Protección de datos de empleados</p>
          <p>• <strong>AEPD</strong> — Sin datos biométricos (fingerprint/reconocimiento facial)</p>
          <p>• Conservación de registros: <strong>4 años mínimo</strong></p>
        </div>
      </main>
    </div>
  );
}
