"use client";

import { useEffect, useState } from "react";
import type { AuditTrailDto } from "@/types";

const ACTION_LABELS: Record<string, string> = {
  CORRECT_CLOCK_IN: "Corrección de entrada",
  CORRECT_CLOCK_OUT: "Corrección de salida",
  ADD_CLOCK_OUT: "Añadir salida olvidada",
  ADD_CLOCK_IN: "Añadir entrada olvidada",
  CANCEL_RECORD: "Registro anulado",
  RESTORE_RECORD: "Registro restaurado",
  EMPLOYEE_EDIT_REQUESTED: "Solicitud de corrección (empleado)",
  EMPLOYEE_EDIT_APPROVED: "Corrección aprobada por superadmin",
  EMPLOYEE_EDIT_REJECTED: "Solicitud rechazada por superadmin",
};

export function AuditModal({
  timeLogId,
  onClose,
}: {
  timeLogId: string;
  onClose: () => void;
}) {
  const [audits, setAudits] = useState<AuditTrailDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/time-logs/${timeLogId}`)
      .then((r) => r.json())
      .then((j) => setAudits(j.data?.auditTrails ?? []))
      .finally(() => setLoading(false));
  }, [timeLogId]);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("es-ES", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-semibold">Registro de Auditoría</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Historial de modificaciones — RD-ley 8/2019, Art. 21
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4">
          {loading && (
            <p className="text-center text-sm text-gray-400 py-8">Cargando...</p>
          )}
          {!loading && audits.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">
              Sin modificaciones registradas.
            </p>
          )}
          {audits.map((a) => (
            <div key={a.id} className="border rounded-xl p-4 bg-amber-50 border-amber-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="badge badge-amber">{ACTION_LABELS[a.action] ?? a.action}</span>
                  <p className="text-sm font-medium text-gray-800 mt-2">
                    Campo modificado: <code className="bg-white px-1 rounded">{a.fieldChanged}</code>
                  </p>
                  {a.oldValue && (
                    <p className="text-sm text-gray-600">
                      Antes:{" "}
                      <span className="font-mono text-danger-600">
                        {tryFormatTime(a.oldValue)}
                      </span>
                    </p>
                  )}
                  {a.newValue && (
                    <p className="text-sm text-gray-600">
                      Después:{" "}
                      <span className="font-mono text-success-600">
                        {tryFormatTime(a.newValue)}
                      </span>
                    </p>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 whitespace-nowrap">{fmt(a.changedAt)}</p>
              </div>

              {/* Justification — legally required */}
              <div className="mt-3 bg-white rounded-lg p-3 border">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Justificación (requerida legalmente)
                </p>
                <p className="text-sm text-gray-800">{a.justification}</p>
              </div>

              <p className="mt-2 text-[11px] text-gray-400">
                Modificado por: {a.auditor.name} {a.auditor.surname} ({a.auditor.username})
              </p>
            </div>
          ))}
        </div>

        <div className="border-t p-4 text-center">
          <p className="text-[11px] text-gray-400">
            Este registro de auditoría es inmutable y se conserva durante 4 años (RD-ley 8/2019).
          </p>
        </div>
      </div>
    </div>
  );
}

function tryFormatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-ES", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
