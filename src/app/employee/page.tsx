"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/Navbar";
import { ClockWidget } from "@/components/ClockWidget";
import { TimeLogTable } from "@/components/TimeLogTable";
import type { TimeLogDto } from "@/types";
import { minutesToHHMM } from "@/lib/client-utils";

export default function EmployeeDashboard() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<TimeLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/time-logs?month=${selectedMonth.month}&year=${selectedMonth.year}`
    );
    const json = await res.json();
    setLogs(json.data ?? []);
    setLoading(false);
  }, [selectedMonth]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const activeLog = logs.find((l) => l.isActive) ?? null;

  // Week stats
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Mon
  weekStart.setHours(0, 0, 0, 0);

  const thisWeekLogs = logs.filter((l) => new Date(l.workDate) >= weekStart);
  const weekMinutes = thisWeekLogs.reduce(
    (acc, l) => acc + (l.effectiveWorkMinutes ?? 0),
    0
  );

  // Today stats
  const todayStr = new Date().toLocaleDateString("es-ES");
  const todayLog = logs.find(
    (l) => new Date(l.workDate).toLocaleDateString("es-ES") === todayStr
  );
  const todayMinutes = todayLog?.effectiveWorkMinutes ?? 0;

  const monthMinutes = logs
    .filter((l) => !l.isCancelled)
    .reduce((acc, l) => acc + (l.effectiveWorkMinutes ?? 0), 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Buenos días, {session?.user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
            {new Date().toLocaleDateString("es-ES", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Clock widget — primary action */}
          <div className="lg:col-span-1">
            <ClockWidget activeLog={activeLog} onAction={fetchLogs} />
          </div>

          {/* Stats */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 content-start">
            <StatCard
              label="Hoy"
              value={minutesToHHMM(todayMinutes)}
              sublabel="horas efectivas"
              color="blue"
            />
            <StatCard
              label="Esta semana"
              value={minutesToHHMM(weekMinutes)}
              sublabel={`de 40h contratadas`}
              color={weekMinutes > 2400 ? "amber" : "green"}
            />
            <StatCard
              label="Este mes"
              value={minutesToHHMM(monthMinutes)}
              sublabel="horas acumuladas"
              color="gray"
            />

            {/* Monthly export (employee self-service) */}
            <div className="sm:col-span-3 card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-slate-200">Mi hoja de horas mensual</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                  Exporta tu propio registro para revisión
                </p>
              </div>
              <a
                href={`/api/export?month=${selectedMonth.month}&year=${selectedMonth.year}&format=pdf&employeeId=${session?.user?.id}`}
                className="btn-outline text-sm"
                target="_blank"
                rel="noreferrer"
              >
                ↓ PDF
              </a>
            </div>
          </div>
        </div>

        {/* History table */}
        <div className="mt-8 card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold text-gray-800 dark:text-slate-100">Historial de registros</h2>
            <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400 dark:text-slate-500">Cargando registros...</div>
          ) : (
            <TimeLogTable logs={logs} showAuditButton={true} />
          )}
        </div>

        {/* Legal notice */}
        <p className="mt-6 text-center text-xs text-gray-400 dark:text-slate-600">
          Conforme al Real Decreto-ley 8/2019 · Los registros son inmutables por el empleado ·
          Conservación: 4 años · Ley 10/2021 (teletrabajo)
        </p>
      </main>
    </div>
  );
}

function StatCard({
  label, value, sublabel, color,
}: {
  label: string; value: string; sublabel: string; color: "blue" | "green" | "amber" | "gray";
}) {
  const colorMap = {
    blue:  "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300",
    green: "bg-success-500/10 text-success-600 dark:text-success-400",
    amber: "bg-warning-500/10 text-warning-600 dark:text-warning-400",
    gray:  "bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300",
  };
  return (
    <div className={`rounded-xl p-4 ${colorMap[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-3xl font-bold font-mono mt-1">{value}</p>
      <p className="text-xs opacity-70 mt-0.5">{sublabel}</p>
    </div>
  );
}

function MonthPicker({
  value,
  onChange,
}: {
  value: { month: number; year: number };
  onChange: (v: { month: number; year: number }) => void;
}) {
  const months = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
  ];
  return (
    <div className="flex items-center gap-2 text-sm">
      <select
        className="input py-1 w-auto"
        value={value.month}
        onChange={(e) => onChange({ ...value, month: Number(e.target.value) })}
      >
        {months.map((m, i) => (
          <option key={i + 1} value={i + 1}>{m}</option>
        ))}
      </select>
      <select
        className="input py-1 w-auto"
        value={value.year}
        onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}
      >
        {[2022, 2023, 2024, 2025, 2026].map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
