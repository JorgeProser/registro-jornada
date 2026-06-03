"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import type { TimeLogDto } from "@/types";

interface Props {
  log: TimeLogDto;
  onClose: () => void;
  onSuccess: () => void;
}

export function RequestEditModal({ log, onClose, onSuccess }: Props) {
  const [field, setField] = useState<"clockIn" | "clockOut">("clockOut");
  const [proposedValue, setProposedValue] = useState("");
  const [justification, setJustification] = useState("");
  const [loading, setLoading] = useState(false);

  const currentIn = log.effectiveClockIn.slice(0, 16);
  const currentOut = log.effectiveClockOut?.slice(0, 16) ?? "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (justification.trim().length < 10) {
      toast.error("La justificación debe tener al menos 10 caracteres");
      return;
    }
    if (!proposedValue) {
      toast.error("Introduce el nuevo valor de fecha/hora");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/time-logs/${log.id}/edit-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldChanged: field,
          proposedValue: new Date(proposedValue).toISOString(),
          justification: justification.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Error al enviar la solicitud");
        return;
      }
      toast.success("Solicitud enviada. El superadmin la revisará en breve.");
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b dark:border-slate-700">
          <h2 className="text-lg font-semibold dark:text-white">Solicitar corrección de registro</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Tu solicitud será revisada por el superadmin antes de aplicarse. El registro original se conserva siempre.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Current values read-only */}
          <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 dark:bg-slate-800 rounded-xl p-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">Entrada actual</p>
              <p className="font-mono font-medium dark:text-slate-200">
                {new Date(log.effectiveClockIn).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">Salida actual</p>
              <p className="font-mono font-medium dark:text-slate-200">
                {log.effectiveClockOut
                  ? new Date(log.effectiveClockOut).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
                  : "Sin salida"}
              </p>
            </div>
          </div>

          <div>
            <label className="label">Campo a corregir</label>
            <select
              className="input"
              value={field}
              onChange={(e) => {
                setField(e.target.value as "clockIn" | "clockOut");
                setProposedValue(e.target.value === "clockIn" ? currentIn : currentOut);
              }}
            >
              <option value="clockIn">Hora de entrada</option>
              <option value="clockOut">Hora de salida</option>
            </select>
          </div>

          <div>
            <label className="label">Valor propuesto</label>
            <input
              type="datetime-local"
              className="input font-mono"
              value={proposedValue}
              onChange={(e) => setProposedValue(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">
              Motivo de la solicitud <span className="text-danger-500">*</span>
              <span className="text-gray-400 font-normal ml-1">(mínimo 10 caracteres — legalmente requerido)</span>
            </label>
            <textarea
              className="input resize-none h-24"
              placeholder="Ej: Olvidé fichar la salida porque tuve que atender una urgencia. La hora real de salida fue las 18:30."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              required
              minLength={10}
            />
            <p className="text-xs text-gray-400 mt-1">{justification.length} / 1000 caracteres</p>
          </div>

          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-700 dark:text-amber-400">
            Tu solicitud quedará registrada en el sistema de auditoría conforme al Real Decreto-ley 8/2019, independientemente de si es aprobada o rechazada.
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline flex-1">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || justification.trim().length < 10}
              className="btn-primary flex-1"
            >
              {loading ? "Enviando..." : "Enviar solicitud"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
