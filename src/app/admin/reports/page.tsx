"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";

interface Employee {
  id: string;
  name: string;
  surname: string;
  username: string;
  department: string | null;
}

export default function ReportsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const MONTHS = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
  ];
  const YEARS = [2022, 2023, 2024, 2025, 2026];

  useEffect(() => {
    fetch("/api/admin/employees")
      .then((r) => r.json())
      .then((j) => setEmployees(j.data ?? []));
  }, []);

  function buildExportUrl(format: string) {
    const params = new URLSearchParams({
      format,
      month: String(month),
      year: String(year),
    });
    if (selectedEmployee !== "all") params.set("employeeId", selectedEmployee);
    return `/api/export?${params.toString()}`;
  }

  const selectedName = selectedEmployee === "all"
    ? "Todos los empleados"
    : employees.find((e) => e.id === selectedEmployee)
        ? `${employees.find((e) => e.id === selectedEmployee)!.surname}, ${employees.find((e) => e.id === selectedEmployee)!.name}`
        : "";

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Informes de Jornada</h1>
          <p className="text-sm text-gray-500 mt-1">
            Exporta hojas de horas mensuales · Conforme al Real Decreto-ley 8/2019
          </p>
        </div>

        {/* Filters card */}
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-gray-800">Configurar informe</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Mes</label>
              <select
                className="input"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Año</label>
              <select
                className="input"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Empleado</label>
              <select
                className="input"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
              >
                <option value="all">Todos los empleados</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.surname}, {e.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Export options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* PDF */}
          <div className="card p-6 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
              <span className="text-2xl">📄</span>
            </div>
            <div>
              <p className="font-semibold text-gray-800">PDF</p>
              <p className="text-xs text-gray-500 mt-1">
                Incluye bloque de firmas para empleado y empresa. Apto para inspección.
              </p>
            </div>
            <a
              href={buildExportUrl("pdf")}
              target="_blank"
              rel="noreferrer"
              className="btn-primary w-full"
            >
              ↓ Descargar PDF
            </a>
          </div>

          {/* Excel */}
          <div className="card p-6 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <p className="font-semibold text-gray-800">Excel</p>
              <p className="text-xs text-gray-500 mt-1">
                Hoja de cálculo editable con todos los registros del período.
              </p>
            </div>
            <a
              href={buildExportUrl("xlsx")}
              target="_blank"
              rel="noreferrer"
              className="btn-outline w-full"
            >
              ↓ Descargar Excel
            </a>
          </div>

          {/* CSV */}
          <div className="card p-6 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
            <div>
              <p className="font-semibold text-gray-800">CSV</p>
              <p className="text-xs text-gray-500 mt-1">
                Formato universal compatible con cualquier software de RRHH.
              </p>
            </div>
            <a
              href={buildExportUrl("csv")}
              target="_blank"
              rel="noreferrer"
              className="btn-outline w-full"
            >
              ↓ Descargar CSV
            </a>
          </div>
        </div>

        {/* Summary of selection */}
        <div className="rounded-xl border bg-white p-4 text-sm text-gray-600 flex items-center gap-3">
          <span className="text-lg">ℹ️</span>
          <span>
            Exportando <strong>{selectedName}</strong> · <strong>{MONTHS[month - 1]} {year}</strong>
          </span>
        </div>

        {/* Legal notice */}
        <div className="rounded-xl border bg-white p-4 text-xs text-gray-400 space-y-1">
          <p className="font-medium text-gray-500">Información legal:</p>
          <p>• Los registros marcados con ★ han sido modificados por RRHH. El registro de auditoría completo está disponible en el sistema.</p>
          <p>• Conservación obligatoria: 4 años (Art. 21 RD-ley 8/2019).</p>
          <p>• El PDF incluye espacio para firma del empleado/a y representante de la empresa.</p>
        </div>
      </main>
    </div>
  );
}
