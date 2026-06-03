"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut, useSession } from "next-auth/react";
import toast from "react-hot-toast";
import type { CompanyDto } from "@/types";

interface EmployeeRow {
  name: string;
  surname: string;
  email: string;
  password: string;
  nss: string;
  position: string;
  department: string;
  weeklyHours: number;
}

const EMPTY_EMPLOYEE: EmployeeRow = {
  name: "", surname: "", email: "", password: "",
  nss: "", position: "", department: "", weeklyHours: 40,
};

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function autoEmail(name: string, surname: string) {
  const slug = slugify(name + surname);
  return slug ? `${slug}@registro.app` : "";
}

function autoPassword(name: string) {
  const first = slugify(name.split(" ")[0]);
  return first ? `${first}123` : "";
}

export default function SuperAdminPage() {
  const { data: session } = useSession();
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CompanyDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/companies");
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? `Error ${res.status}`);
        setLoading(false);
        return;
      }
      setCompanies(json.data ?? []);
    } catch (e) {
      toast.error("Error de red al cargar empresas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/superadmin/companies/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Error al eliminar");
        return;
      }
      toast.success(`${deleteTarget.name} eliminada`);
      setDeleteTarget(null);
      fetchCompanies();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Panel de Superadministrador</h1>
          <p className="text-sm text-gray-500">{session?.user?.email}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn-outline text-sm"
        >
          Cerrar sesión
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Title bar */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Empresas registradas</h2>
            <p className="text-sm text-gray-500">{companies.length} empresas en el sistema</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            + Nueva empresa
          </button>
        </div>

        {/* Company list */}
        {loading ? (
          <div className="card py-12 text-center text-sm text-gray-400">Cargando...</div>
        ) : companies.length === 0 ? (
          <div className="card py-12 text-center text-sm text-gray-400">
            No hay empresas. Crea la primera.
          </div>
        ) : (
          <div className="space-y-3">
            {companies.map((co) => (
              <div key={co.id} className="card overflow-hidden">
                {/* Company row */}
                <div
                  className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(expandedId === co.id ? null : co.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-gray-900">{co.name}</span>
                      <span className="badge badge-blue font-mono text-xs">{co.cif}</span>
                      <span className="text-sm text-gray-500">
                        {co.employeeCount} empleado{co.employeeCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {co.address} · {co.postalCode} {co.city} ({co.province})
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">
                      {expandedId === co.id ? "▲" : "▼"}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(co); }}
                      className="text-danger-500 hover:text-danger-700 text-sm px-2 py-1 rounded hover:bg-danger-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {/* Employees accordion */}
                {expandedId === co.id && (
                  <div className="border-t">
                    {co.employees.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-gray-400">Sin empleados.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                              <th className="px-4 py-3 text-left">Nombre</th>
                              <th className="px-4 py-3 text-left">Email</th>
                              <th className="px-4 py-3 text-left">Nº SS</th>
                              <th className="px-4 py-3 text-left">Cargo</th>
                              <th className="px-4 py-3 text-center">Horas/sem</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {co.employees.map((emp) => (
                              <tr key={emp.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 font-medium">
                                  {emp.surname ? `${emp.surname}, ${emp.name}` : emp.name}
                                </td>
                                <td className="px-4 py-2 text-gray-500">{emp.email}</td>
                                <td className="px-4 py-2 font-mono text-xs text-gray-500">{emp.nss ?? "—"}</td>
                                <td className="px-4 py-2 text-gray-500">{emp.position ?? "—"}</td>
                                <td className="px-4 py-2 text-center font-mono">{emp.weeklyHours}h</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create company modal */}
      {showCreate && (
        <CreateCompanyModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); fetchCompanies(); }}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Eliminar empresa</h2>
            <p className="text-sm text-gray-600">
              ¿Seguro que quieres eliminar <strong>{deleteTarget.name}</strong> y todos sus empleados?
              Esta acción no se puede deshacer.
            </p>
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
              Solo se permite eliminar empresas sin registros de jornada. Si la empresa tiene historial de fichajes, la eliminación será rechazada.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteTarget(null)} className="btn-outline flex-1" disabled={deleting}>
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-danger-500 hover:bg-danger-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
              >
                {deleting ? "Eliminando..." : "Eliminar empresa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Create Company Modal ────────────────────────────────────

function CreateCompanyModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState({
    name: "", cif: "", address: "", postalCode: "", city: "", province: "",
  });
  const [employees, setEmployees] = useState<EmployeeRow[]>([{ ...EMPTY_EMPLOYEE }]);

  function updateEmployee(i: number, field: keyof EmployeeRow, value: string | number) {
    setEmployees((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      // Auto-fill email and password when name/surname changes
      if (field === "name" || field === "surname") {
        const name = field === "name" ? String(value) : next[i].name;
        const surname = field === "surname" ? String(value) : next[i].surname;
        if (!next[i].email || next[i].email === autoEmail(next[i].name, next[i].surname)) {
          next[i].email = autoEmail(name, surname);
        }
        if (!next[i].password || next[i].password === autoPassword(next[i].name)) {
          next[i].password = autoPassword(name);
        }
        if (field === "name") next[i].name = String(value);
        if (field === "surname") next[i].surname = String(value);
      }
      return next;
    });
  }

  function addEmployee() {
    setEmployees((prev) => [...prev, { ...EMPTY_EMPLOYEE }]);
  }

  function removeEmployee(i: number) {
    setEmployees((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...company,
          employees: employees.filter((emp) => emp.name.trim()),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Error al crear empresa");
        return;
      }
      toast.success(`${company.name} creada correctamente`);
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Nueva empresa</h2>
          <p className="text-sm text-gray-500 mt-1">Completa los datos y añade los empleados.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Company details */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Datos de la empresa</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="label">Nombre <span className="text-danger-500">*</span></label>
                  <input className="input" value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} required />
                </div>
                <div>
                  <label className="label">CIF <span className="text-danger-500">*</span></label>
                  <input className="input font-mono" placeholder="B12345678" value={company.cif} onChange={(e) => setCompany({ ...company, cif: e.target.value.toUpperCase() })} required />
                </div>
                <div className="col-span-2">
                  <label className="label">Domicilio fiscal <span className="text-danger-500">*</span></label>
                  <input className="input" placeholder="Calle Mayor, 1" value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Código postal <span className="text-danger-500">*</span></label>
                  <input className="input font-mono" placeholder="28001" value={company.postalCode} onChange={(e) => setCompany({ ...company, postalCode: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Ciudad <span className="text-danger-500">*</span></label>
                  <input className="input" value={company.city} onChange={(e) => setCompany({ ...company, city: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Provincia <span className="text-danger-500">*</span></label>
                  <input className="input" value={company.province} onChange={(e) => setCompany({ ...company, province: e.target.value })} required />
                </div>
              </div>
            </section>

            {/* Employees */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Empleados ({employees.filter((e) => e.name.trim()).length})
                </h3>
                <button type="button" onClick={addEmployee} className="btn-outline text-xs py-1 px-3">
                  + Añadir empleado
                </button>
              </div>

              {employees.map((emp, i) => (
                <div key={i} className="border rounded-xl p-4 space-y-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Empleado {i + 1}</span>
                    {employees.length > 1 && (
                      <button type="button" onClick={() => removeEmployee(i)} className="text-xs text-danger-500 hover:underline">
                        Eliminar
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">Nombre <span className="text-danger-500">*</span></label>
                      <input className="input" placeholder="Ana" value={emp.name}
                        onChange={(e) => updateEmployee(i, "name", e.target.value)} />
                    </div>
                    <div>
                      <label className="label text-xs">Apellidos</label>
                      <input className="input" placeholder="García López" value={emp.surname}
                        onChange={(e) => updateEmployee(i, "surname", e.target.value)} />
                    </div>
                    <div>
                      <label className="label text-xs">Nº Seguridad Social</label>
                      <input className="input font-mono" placeholder="28/12345678-90" value={emp.nss}
                        onChange={(e) => updateEmployee(i, "nss", e.target.value)} />
                    </div>
                    <div>
                      <label className="label text-xs">Cargo</label>
                      <input className="input" placeholder="Contable" value={emp.position}
                        onChange={(e) => updateEmployee(i, "position", e.target.value)} />
                    </div>
                    <div>
                      <label className="label text-xs">Email (acceso) <span className="text-danger-500">*</span></label>
                      <input className="input font-mono text-xs" value={emp.email}
                        onChange={(e) => updateEmployee(i, "email", e.target.value)} />
                    </div>
                    <div>
                      <label className="label text-xs">Contraseña inicial <span className="text-danger-500">*</span></label>
                      <input className="input font-mono text-xs" value={emp.password}
                        onChange={(e) => updateEmployee(i, "password", e.target.value)} />
                    </div>
                    <div>
                      <label className="label text-xs">Horas semanales</label>
                      <input type="number" className="input" min={1} max={60} value={emp.weeklyHours}
                        onChange={(e) => updateEmployee(i, "weeklyHours", Number(e.target.value))} />
                    </div>
                  </div>
                </div>
              ))}
            </section>
          </div>

          <div className="p-6 border-t flex gap-3">
            <button type="button" onClick={onClose} className="btn-outline flex-1" disabled={loading}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? "Creando..." : "Crear empresa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
