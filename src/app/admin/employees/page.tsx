"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { CreateEmployeeModal } from "@/components/CreateEmployeeModal";
import toast from "react-hot-toast";
import type { Role } from "@prisma/client";

interface Employee {
  id: string;
  username: string;
  name: string;
  surname: string;
  role: string;
  department: string | null;
  position: string | null;
  nss: string | null;
  weeklyHours: number;
  createdAt: string;
}

const ROLES = [
  { value: "EMPLOYEE", label: "Empleado/a" },
  { value: "MANAGER", label: "RRHH / Admin" },
  { value: "INSPECTOR", label: "Inspector" },
];

const roleLabel: Record<string, string> = {
  EMPLOYEE: "Empleado/a",
  MANAGER: "RRHH / Admin",
  INSPECTOR: "Inspector",
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
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
    `${e.name} ${e.surname} ${e.username} ${e.department ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

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

        <div className="card p-4">
          <input
            type="text"
            className="input"
            placeholder="Buscar por nombre, usuario o departamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

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
                    <th className="px-4 py-3 text-left">Usuario</th>
                    <th className="px-4 py-3 text-left">Nº SS</th>
                    <th className="px-4 py-3 text-left">Departamento</th>
                    <th className="px-4 py-3 text-left">Cargo</th>
                    <th className="px-4 py-3 text-left">Rol</th>
                    <th className="px-4 py-3 text-center">Horas/semana</th>
                    <th className="px-4 py-3 text-left">Alta</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        {emp.surname ? `${emp.surname}, ${emp.name}` : emp.name}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono">{emp.username}</td>
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
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setEditTarget(emp)}
                          className="text-brand-600 hover:underline text-xs"
                        >
                          Editar
                        </button>
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

      {editTarget && (
        <EditEmployeeModal
          employee={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => { setEditTarget(null); fetchEmployees(); }}
        />
      )}
    </div>
  );
}

// ── Edit Employee Modal ─────────────────────────────────────

function EditEmployeeModal({
  employee,
  onClose,
  onSuccess,
}: {
  employee: Employee;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: employee.username,
    name: employee.name,
    surname: employee.surname ?? "",
    role: employee.role as Role,
    department: employee.department ?? "",
    position: employee.position ?? "",
    nss: employee.nss ?? "",
    weeklyHours: employee.weeklyHours,
    password: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        username: form.username,
        name: form.name,
        surname: form.surname,
        role: form.role,
        department: form.department || null,
        position: form.position || null,
        nss: form.nss || null,
        weeklyHours: form.weeklyHours,
      };
      if (form.password) body.password = form.password;

      const res = await fetch(`/api/admin/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Error al guardar");
        return;
      }
      toast.success("Empleado actualizado");
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Editar empleado</h2>
          <p className="text-sm text-gray-500 mt-1">
            {employee.name} {employee.surname}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="label">Usuario <span className="text-danger-500">*</span></label>
            <input
              type="text"
              className="input font-mono uppercase"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toUpperCase().replace(/\s/g, "") })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre <span className="text-danger-500">*</span></label>
              <input
                type="text"
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Apellidos</label>
              <input
                type="text"
                className="input"
                value={form.surname}
                onChange={(e) => setForm({ ...form, surname: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">Nº Seguridad Social</label>
            <input
              type="text"
              className="input font-mono"
              placeholder="28/12345678-90"
              value={form.nss}
              onChange={(e) => setForm({ ...form, nss: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Departamento</label>
              <input
                type="text"
                className="input"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Cargo</label>
              <input
                type="text"
                className="input"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Rol</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Horas semanales</label>
              <input
                type="number"
                className="input"
                min={1}
                max={60}
                value={form.weeklyHours}
                onChange={(e) => setForm({ ...form, weeklyHours: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="label">Nueva contraseña <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input
              type="password"
              className="input"
              placeholder="Dejar en blanco para no cambiar"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={8}
            />
            <p className="text-xs text-gray-400 mt-1">Mínimo 8 caracteres.</p>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn-outline flex-1" disabled={loading}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
