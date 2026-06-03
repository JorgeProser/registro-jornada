"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { CreateEmployeeModal } from "@/components/CreateEmployeeModal";

interface Employee {
  id: string;
  email: string;
  name: string;
  surname: string;
  role: string;
  department: string | null;
  position: string | null;
  nss: string | null;
  weeklyHours: number;
  createdAt: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/employees");
    const json = await res.json();
    setEmployees(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const filtered = employees.filter((e) =>
    `${e.name} ${e.surname} ${e.email} ${e.department ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const roleLabel: Record<string, string> = {
    EMPLOYEE: "Empleado/a",
    MANAGER: "RRHH / Admin",
    INSPECTOR: "Inspector",
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
            <p className="text-sm text-gray-500 mt-1">{employees.length} usuarios en total</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            + Nuevo empleado
          </button>
        </div>

        {/* Search */}
        <div className="card p-4">
          <input
            type="text"
            className="input"
            placeholder="Buscar por nombre, email o departamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              {search ? "No se encontraron resultados." : "No hay empleados. Crea el primero."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Nº SS</th>
                    <th className="px-4 py-3 text-left">Departamento</th>
                    <th className="px-4 py-3 text-left">Cargo</th>
                    <th className="px-4 py-3 text-left">Rol</th>
                    <th className="px-4 py-3 text-center">Horas/semana</th>
                    <th className="px-4 py-3 text-left">Alta</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        {emp.surname}, {emp.name}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{emp.email}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{emp.nss ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{emp.department ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{emp.position ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${emp.role === "MANAGER" ? "badge-blue" : emp.role === "INSPECTOR" ? "badge-amber" : "badge-green"}`}>
                          {roleLabel[emp.role] ?? emp.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono">{emp.weeklyHours}h</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(emp.createdAt).toLocaleDateString("es-ES")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showCreate && (
        <CreateEmployeeModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); fetchEmployees(); }}
        />
      )}
    </div>
  );
}
