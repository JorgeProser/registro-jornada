"use client";

import { useState } from "react";
import type { TimeLogDto } from "@/types";
import { AuditModal } from "./AuditModal";

interface Props {
  logs: TimeLogDto[];
  showAuditButton?: boolean;
  onEditRequest?: (log: TimeLogDto) => void;
}

const LOCATION_ES: Record<string, string> = {
  OFFICE: "Oficina",
  REMOTE: "Teletrabajo",
  DISPLACEMENT: "Desplazamiento",
  OTHER: "Otro",
};

export function TimeLogTable({ logs, showAuditButton = false, onEditRequest }: Props) {
  const [auditLogId, setAuditLogId] = useState<string | null>(null);

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        No hay registros para mostrar en este período.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Entrada</th>
              <th className="px-4 py-3">Salida</th>
              <th className="px-4 py-3">Pausa</th>
              <th className="px-4 py-3">Efectivas</th>
              <th className="px-4 py-3">Modalidad</th>
              <th className="px-4 py-3">Estado</th>
              {(showAuditButton || onEditRequest) && <th className="px-4 py-3">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.map((log) => (
              <TimeLogRow
                key={log.id}
                log={log}
                showAuditButton={showAuditButton}
                onAudit={() => setAuditLogId(log.id)}
                onEditRequest={onEditRequest ? () => onEditRequest(log) : undefined}
              />
            ))}
          </tbody>
        </table>
      </div>

      {auditLogId && (
        <AuditModal
          timeLogId={auditLogId}
          onClose={() => setAuditLogId(null)}
        />
      )}
    </>
  );
}

function TimeLogRow({
  log,
  showAuditButton,
  onAudit,
  onEditRequest,
}: {
  log: TimeLogDto;
  showAuditButton: boolean;
  onAudit: () => void;
  onEditRequest?: () => void;
}) {
  const corrected = log.effectiveClockIn !== log.originalClockIn || log.effectiveClockOut !== log.originalClockOut;

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "—";

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "2-digit" });

  const fmtMins = (mins: number | null) => {
    if (mins === null) return "—";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <tr
      className={`hover:bg-gray-50 transition-colors ${
        log.isCancelled ? "opacity-40 line-through" : ""
      } ${corrected ? "bg-amber-50" : ""}`}
    >
      <td className="px-4 py-3 font-medium">{fmtDate(log.workDate)}</td>
      <td className="px-4 py-3">
        {fmt(log.effectiveClockIn)}
        {corrected && log.effectiveClockIn !== log.originalClockIn && (
          <CorrectedBadge original={fmt(log.originalClockIn)} />
        )}
      </td>
      <td className="px-4 py-3">
        {fmt(log.effectiveClockOut)}
        {corrected && log.effectiveClockOut !== log.originalClockOut && (
          <CorrectedBadge original={fmt(log.originalClockOut)} />
        )}
      </td>
      <td className="px-4 py-3 text-gray-500">{fmtMins(log.totalBreakMinutes)}</td>
      <td className="px-4 py-3 font-semibold">
        {log.isActive ? (
          <span className="badge badge-green">En curso</span>
        ) : (
          fmtMins(log.effectiveWorkMinutes)
        )}
      </td>
      <td className="px-4 py-3 text-gray-500">{LOCATION_ES[log.location] ?? log.location}</td>
      <td className="px-4 py-3">
        {log.isCancelled && <span className="badge badge-red">Anulado</span>}
        {!log.isCancelled && corrected && <span className="badge badge-amber">★ Corregido</span>}
        {!log.isCancelled && !corrected && log.effectiveClockOut && (
          <span className="badge badge-green">Completo</span>
        )}
        {!log.isCancelled && log.isActive && (
          <span className="badge badge-green animate-pulse">Activo</span>
        )}
      </td>
      {(showAuditButton || onEditRequest) && (
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1">
            {showAuditButton && log.hasAuditTrail && (
              <button
                onClick={onAudit}
                className="text-xs text-brand-600 hover:underline font-medium text-left"
              >
                Ver auditoría
              </button>
            )}
            {onEditRequest && !log.isActive && !log.isCancelled && (
              <button
                onClick={onEditRequest}
                className="text-xs text-amber-600 hover:underline font-medium text-left"
              >
                Solicitar corrección
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}

function CorrectedBadge({ original }: { original: string }) {
  return (
    <span
      className="ml-1 text-[10px] text-amber-600 bg-amber-100 rounded px-1 cursor-help"
      title={`Original: ${original}`}
    >
      orig: {original}
    </span>
  );
}
