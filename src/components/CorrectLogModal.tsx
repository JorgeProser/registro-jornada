"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import type { TimeLogDto } from "@/types";

interface Props {
  log: TimeLogDto;
  onClose: () => void;
  onSuccess: () => void;
}

export function CorrectLogModal({ log, onClose, onSuccess }: Props) {
  const [field, setField] = useState<"clockIn" | "clockOut">("clockOut");
  const [newValue, setNewValue] = useState("");
  const [justification, setJustification] = useState("");
  const [loading, setLoading] = useState(false);

  // Pre-fill with current effective values
  const currentIn = log.effectiveClockIn.slice(0, 16); // trim to minute
  const currentOut = log.effectiveClockOut?.slice(0, 16) ?? "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (justification.trim().length < 10) {
      toast.error("La justificación debe tener al menos 10 caracteres");
      return;
    }
    if (!newValue) {
      toast.error("Introduce el nuevo valor de fecha/hora");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/time-logs/${log.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldChanged: field,
          newValue: new Date(newValue).toISOString(),
          justification: justification.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Error al corregir el registro");
        return;
      }
      toast.success("Corrección guardada y auditada");
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Corregir Registro</h2>
          <p className="text-sm text-gray-500 mt-1">
            La corrección se auditará automáticamente. El registro original se conserva.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Current values read-only */}
          <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-xl p-4">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Entrada efectiva actual</p>
              <p className="font-mono font-medium">
                {new Date(log.effectiveClockIn).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Salida efectiva actual</p>
              <p className="font-mono font-medium">
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
                setNewValue(e.target.value === "clockIn" ? currentIn : currentOut);
              }}
            >
              <option value="clockIn">Hora de entrada</option>
              <option value="clockOut">Hora de salida</option>
            </select>
          </div>

          <div>
            <label className="label">Nuevo valor</label>
            <input
              type="datetime-local"
              className="input font-mono"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">
              Justificación <span className="text-danger-500">*</span>
              <span className="text-gray-400 font-normal ml-1">(mínimo 10 caracteres — legalmente requerida)</span>
            </label>
            <textarea
              className="input resize-none h-24"
              placeholder="Ej: El empleado olvidó fichar la salida al ausentarse por emergencia médica personal."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              required
              minLength={10}
            />
            <p className="text-xs text-gray-400 mt-1">
              {justification.length} / 1000 caracteres
            </p>
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
              {loading ? "Guardando..." : "Guardar corrección"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
