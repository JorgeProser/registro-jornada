"use client";

import { useState, useEffect, useCallback } from "react";
import { differenceInSeconds } from "date-fns";
import toast from "react-hot-toast";
import type { TimeLogDto, WorkLocation } from "@/types";

interface Props {
  activeLog: TimeLogDto | null;
  onAction: () => void; // refresh parent
}

const LOCATION_LABELS: Record<WorkLocation, string> = {
  OFFICE: "Oficina",
  REMOTE: "Teletrabajo",
  DISPLACEMENT: "Desplazamiento",
  OTHER: "Otro",
};

export function ClockWidget({ activeLog, onAction }: Props) {
  const [elapsed, setElapsed] = useState(0); // seconds since clock-in
  const [breakElapsed, setBreakElapsed] = useState(0);
  const [location, setLocation] = useState<WorkLocation>("OFFICE");
  const [loading, setLoading] = useState(false);

  const activeBreak = activeLog?.breaks.find((b) => !b.endTime) ?? null;
  const clockInTime = activeLog?.effectiveClockIn
    ? new Date(activeLog.effectiveClockIn)
    : null;

  // Real-time elapsed counter
  useEffect(() => {
    if (!clockInTime) { setElapsed(0); return; }
    const tick = () => {
      const totalSecs = differenceInSeconds(new Date(), clockInTime);
      const breakSecs = (activeLog?.totalBreakMinutes ?? 0) * 60;
      // Add current open break if any
      const openBreakSecs = activeBreak
        ? differenceInSeconds(new Date(), new Date(activeBreak.startTime))
        : 0;
      setElapsed(Math.max(0, totalSecs - breakSecs - openBreakSecs));
      setBreakElapsed(breakSecs + openBreakSecs);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [clockInTime, activeLog?.totalBreakMinutes, activeBreak]);

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const clockIn = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/time-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al fichar entrada"); return; }
      toast.success("¡Entrada registrada!");
      onAction();
    } finally {
      setLoading(false);
    }
  }, [location, onAction]);

  const clockOut = useCallback(async () => {
    if (!activeLog) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/time-logs/${activeLog.id}/clock-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al fichar salida"); return; }
      toast.success("¡Salida registrada!");
      onAction();
    } finally {
      setLoading(false);
    }
  }, [activeLog, onAction]);

  const startBreak = useCallback(async (type: "REST" | "LUNCH") => {
    if (!activeLog) return;
    setLoading(true);
    try {
      const res = await fetch("/api/breaks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeLogId: activeLog.id, type }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error"); return; }
      toast.success("Descanso iniciado");
      onAction();
    } finally {
      setLoading(false);
    }
  }, [activeLog, onAction]);

  const endBreak = useCallback(async () => {
    if (!activeBreak) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/breaks/${activeBreak.id}/end`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error"); return; }
      toast.success("Descanso finalizado");
      onAction();
    } finally {
      setLoading(false);
    }
  }, [activeBreak, onAction]);

  const isClocked = !!activeLog;
  const isOnBreak = !!activeBreak;

  return (
    <div className="card p-6 flex flex-col gap-6">
      {/* Status indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${
              isClocked
                ? isOnBreak
                  ? "bg-warning-500 animate-pulse"
                  : "bg-success-500 animate-pulse"
                : "bg-gray-300"
            }`}
          />
          <span className="text-sm font-medium text-gray-700">
            {!isClocked && "Sin fichar"}
            {isClocked && isOnBreak && "En descanso"}
            {isClocked && !isOnBreak && "Trabajando"}
          </span>
        </div>
        {isClocked && (
          <span className="badge badge-blue">{LOCATION_LABELS[activeLog.location]}</span>
        )}
      </div>

      {/* Main timer */}
      <div className="text-center py-2">
        <p className="text-5xl font-mono font-bold tracking-tight text-gray-900">
          {formatDuration(elapsed)}
        </p>
        <p className="text-sm text-gray-400 mt-1">horas efectivas trabajadas hoy</p>
        {breakElapsed > 0 && (
          <p className="text-xs text-warning-600 mt-1">
            + {formatDuration(breakElapsed)} en descanso
          </p>
        )}
      </div>

      {/* Clock-in location selector */}
      {!isClocked && (
        <div>
          <label className="label">Modalidad de trabajo</label>
          <select
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value as WorkLocation)}
          >
            {Object.entries(LOCATION_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Primary action */}
      {!isClocked ? (
        <button
          onClick={clockIn}
          disabled={loading}
          className="btn-success w-full py-4 text-lg rounded-xl shadow-md hover:shadow-lg transition-shadow"
        >
          <span className="text-xl">↓</span> Fichar Entrada
        </button>
      ) : (
        <button
          onClick={clockOut}
          disabled={loading || isOnBreak}
          className="btn-danger w-full py-4 text-lg rounded-xl shadow-md hover:shadow-lg transition-shadow disabled:opacity-50"
          title={isOnBreak ? "Finaliza el descanso primero" : ""}
        >
          <span className="text-xl">↑</span> Fichar Salida
        </button>
      )}

      {/* Break controls */}
      {isClocked && (
        <div className="border-t pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Descansos
          </p>
          {isOnBreak ? (
            <button
              onClick={endBreak}
              disabled={loading}
              className="btn-primary w-full"
            >
              ▶ Finalizar descanso ({formatDuration(breakElapsed)})
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => startBreak("REST")}
                disabled={loading}
                className="btn-outline flex-1 text-sm"
              >
                ☕ Descanso
              </button>
              <button
                onClick={() => startBreak("LUNCH")}
                disabled={loading}
                className="btn-outline flex-1 text-sm"
              >
                🍽 Comida
              </button>
            </div>
          )}
        </div>
      )}

      {/* Legal notice */}
      {isClocked && (
        <p className="text-[11px] text-gray-400 text-center">
          Hora entrada: {new Date(activeLog.effectiveClockIn).toLocaleTimeString("es-ES")}
          {" · "}Registro inmutable conforme a RD-ley 8/2019
        </p>
      )}
    </div>
  );
}
