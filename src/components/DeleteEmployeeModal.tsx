"use client";

import { useState } from "react";
import toast from "react-hot-toast";

interface Employee {
  id: string;
  name: string;
  surname: string;
  username: string;
}

interface Props {
  employee: Employee;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteEmployeeModal({ employee, onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<"soft" | "permanent" | null>(null);
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const fullName = `${employee.name} ${employee.surname}`.trim();
  const isPermanent = mode === "permanent";
  const canSubmit = mode !== null && (!isPermanent || confirm === employee.username);

  async function handleDelete() {
    if (!mode) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/employees/${employee.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Error al eliminar");
        return;
      }
      if (mode === "soft") {
        toast.success(`${fullName} dado de baja. Datos conservados 4 años.`);
      } else {
        toast.success(`${fullName} eliminado permanentemente.`);
      }
      onSuccess();
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
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dar de baja / Eliminar empleado</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{fullName} · <span className="font-mono">{employee.username}</span></p>
        </div>

        <div className="p-6 space-y-4">
          {/* Option A: Soft delete */}
          <button
            type="button"
            onClick={() => setMode("soft")}
            className={`w-full text-left rounded-xl border-2 p-4 transition-colors ${
              mode === "soft"
                ? "border-warning-500 bg-warning-50 dark:bg-warning-900/20"
                : "border-gray-200 dark:border-slate-700 hover:border-warning-300"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">📁</span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Dar de baja laboral</p>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  El empleado deja de tener acceso. Sus registros se conservan durante 4 años según el
                  RD-ley 8/2019. El nombre de usuario queda libre para reutilizarse.
                </p>
              </div>
            </div>
          </button>

          {/* Option B: Permanent delete */}
          <button
            type="button"
            onClick={() => setMode("permanent")}
            className={`w-full text-left rounded-xl border-2 p-4 transition-colors ${
              mode === "permanent"
                ? "border-danger-500 bg-danger-50 dark:bg-danger-900/20"
                : "border-gray-200 dark:border-slate-700 hover:border-danger-300"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">🗑️</span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Eliminar definitivamente</p>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  Borra al empleado y <strong>todos sus registros de jornada</strong> de forma irreversible.
                  Solo para usuarios creados por error. No apto para bajas laborales reales.
                </p>
              </div>
            </div>
          </button>

          {/* Permanent confirm field */}
          {mode === "permanent" && (
            <div className="rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 p-4 space-y-3">
              <p className="text-sm font-semibold text-danger-700 dark:text-danger-400">
                Esta acción es irreversible. Escribe el nombre de usuario para confirmar:
              </p>
              <p className="text-xs font-mono bg-white dark:bg-slate-900 border border-danger-200 dark:border-danger-700 rounded px-2 py-1 text-danger-700 dark:text-danger-300">
                {employee.username}
              </p>
              <input
                type="text"
                className="input font-mono uppercase"
                placeholder={employee.username}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value.toUpperCase().replace(/\s/g, ""))}
                autoFocus
              />
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline flex-1"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!canSubmit || loading}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40 ${
                mode === "permanent"
                  ? "bg-danger-600 hover:bg-danger-700 text-white"
                  : "bg-warning-500 hover:bg-warning-600 text-white"
              }`}
            >
              {loading
                ? "Procesando..."
                : mode === "permanent"
                ? "Eliminar definitivamente"
                : "Dar de baja"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
