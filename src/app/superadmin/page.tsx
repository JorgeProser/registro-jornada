"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut, useSession } from "next-auth/react";
import toast from "react-hot-toast";
import type { CompanyDto, CompanyEmployeeDto } from "@/types";

// ── Helpers ─────────────────────────────────────────────────

interface NewEmployeeRow {
  name: string; surname: string; email: string; password: string;
  nss: string; position: string; department: string; weeklyHours: number;
}

const EMPTY_ROW: NewEmployeeRow = {
  name: "", surname: "", email: "", password: "",
  nss: "", position: "", department: "", weeklyHours: 40,
};

function slugify(str: string) {
  return str.toLowerCase().normalize("NFD")
    .replace(/[̀-ͯ]/g, "").replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
}
function autoEmail(name: string, surname: string) {
  const s = slugify(name + surname); return s ? `${s}@registro.app` : "";
}
function autoPassword(name: string) {
  const f = slugify(name.split(" ")[0]); return f ? `${f}123` : "";
}

// ── Main page ───────────────────────────────────────────────

export default function SuperAdminPage() {
  const { data: session } = useSession();
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // modals
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [deleteCompanyTarget, setDeleteCompanyTarget] = useState<CompanyDto | null>(null);
  const [deletingCompany, setDeletingCompany] = useState(false);

  const [addEmpCompany, setAddEmpCompany] = useState<CompanyDto | null>(null);
  const [editEmpTarget, setEditEmpTarget] = useState<{ emp: CompanyEmployeeDto; companyId: string } | null>(null);
  const [deleteEmpTarget, setDeleteEmpTarget] = useState<{ emp: CompanyEmployeeDto } | null>(null);
  const [deletingEmp, setDeletingEmp] = useState(false);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/companies");
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? `Error ${res.status}`); return; }
      setCompanies(json.data ?? []);
    } catch { toast.error("Error de red"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  async function handleDeleteCompany() {
    if (!deleteCompanyTarget) return;
    setDeletingCompany(true);
    try {
      const res = await fetch(`/api/superadmin/companies/${deleteCompanyTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al eliminar"); return; }
      toast.success(`${deleteCompanyTarget.name} eliminada`);
      setDeleteCompanyTarget(null);
      fetchCompanies();
    } finally { setDeletingCompany(false); }
  }

  async function handleDeleteEmployee() {
    if (!deleteEmpTarget) return;
    setDeletingEmp(true);
    try {
      const res = await fetch(`/api/superadmin/employees/${deleteEmpTarget.emp.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al eliminar"); return; }
      toast.success(json.data?.message ?? "Empleado eliminado");
      setDeleteEmpTarget(null);
      fetchCompanies();
    } finally { setDeletingEmp(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Panel de Superadministrador</h1>
          <p className="text-sm text-gray-500">{session?.user?.email}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowChangePassword(true)} className="btn-outline text-sm">
            Cambiar contraseña
          </button>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="btn-outline text-sm">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Empresas registradas</h2>
            <p className="text-sm text-gray-500">{companies.length} empresas en el sistema</p>
          </div>
          <button onClick={() => setShowCreateCompany(true)} className="btn-primary">+ Nueva empresa</button>
        </div>

        {loading ? (
          <div className="card py-12 text-center text-sm text-gray-400">Cargando...</div>
        ) : companies.length === 0 ? (
          <div className="card py-12 text-center text-sm text-gray-400">No hay empresas. Crea la primera.</div>
        ) : (
          <div className="space-y-3">
            {companies.map((co) => (
              <div key={co.id} className="card overflow-hidden">
                {/* Company header row */}
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
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => { setAddEmpCompany(co); setExpandedId(co.id); }}
                      className="text-brand-600 hover:underline text-xs px-2 py-1"
                    >
                      + Empleado
                    </button>
                    <button
                      onClick={() => setDeleteCompanyTarget(co)}
                      className="text-danger-500 hover:text-danger-700 text-xs px-2 py-1 rounded hover:bg-danger-50"
                    >
                      Eliminar empresa
                    </button>
                    <span className="text-xs text-gray-400 pl-1">{expandedId === co.id ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Employee list */}
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
                              <th className="px-4 py-3"></th>
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
                                <td className="px-4 py-2 flex gap-3 justify-end">
                                  <button
                                    onClick={() => setEditEmpTarget({ emp, companyId: co.id })}
                                    className="text-brand-600 hover:underline text-xs"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => setDeleteEmpTarget({ emp })}
                                    className="text-danger-500 hover:underline text-xs"
                                  >
                                    Eliminar
                                  </button>
                                </td>
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

      {/* ── Modals ── */}

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}

      {showCreateCompany && (
        <CreateCompanyModal
          onClose={() => setShowCreateCompany(false)}
          onSuccess={() => { setShowCreateCompany(false); fetchCompanies(); }}
        />
      )}

      {addEmpCompany && (
        <AddEmployeeModal
          company={addEmpCompany}
          onClose={() => setAddEmpCompany(null)}
          onSuccess={() => { setAddEmpCompany(null); fetchCompanies(); }}
        />
      )}

      {editEmpTarget && (
        <EditEmployeeModal
          emp={editEmpTarget.emp}
          onClose={() => setEditEmpTarget(null)}
          onSuccess={() => { setEditEmpTarget(null); fetchCompanies(); }}
        />
      )}

      {deleteEmpTarget && (
        <ConfirmModal
          title="Eliminar empleado"
          body={
            <>
              ¿Eliminar a <strong>{deleteEmpTarget.emp.name} {deleteEmpTarget.emp.surname}</strong>?
              <p className="mt-2 text-xs text-amber-600 bg-amber-50 rounded p-2">
                Si tiene registros de jornada se hará baja lógica (datos conservados por ley). Si no tiene registros se elimina permanentemente.
              </p>
            </>
          }
          confirmLabel="Eliminar"
          loading={deletingEmp}
          onCancel={() => setDeleteEmpTarget(null)}
          onConfirm={handleDeleteEmployee}
        />
      )}

      {deleteCompanyTarget && (
        <ConfirmModal
          title="Eliminar empresa"
          body={
            <>
              ¿Eliminar <strong>{deleteCompanyTarget.name}</strong> y todos sus empleados?
              <p className="mt-2 text-xs text-amber-600 bg-amber-50 rounded p-2">
                Solo se permite si la empresa no tiene registros de jornada.
              </p>
            </>
          }
          confirmLabel="Eliminar empresa"
          loading={deletingCompany}
          onCancel={() => setDeleteCompanyTarget(null)}
          onConfirm={handleDeleteCompany}
        />
      )}
    </div>
  );
}

// ── Confirm Modal ────────────────────────────────────────────

function ConfirmModal({ title, body, confirmLabel, loading, onCancel, onConfirm }: {
  title: string; body: React.ReactNode; confirmLabel: string;
  loading: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <div className="text-sm text-gray-600">{body}</div>
        <div className="flex gap-3 pt-2">
          <button onClick={onCancel} className="btn-outline flex-1" disabled={loading}>Cancelar</button>
          <button
            onClick={onConfirm} disabled={loading}
            className="flex-1 px-4 py-2 bg-danger-500 hover:bg-danger-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
          >
            {loading ? "Eliminando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Employee Modal ───────────────────────────────────────

function AddEmployeeModal({ company, onClose, onSuccess }: {
  company: CompanyDto; onClose: () => void; onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<NewEmployeeRow>({ ...EMPTY_ROW });

  function set(field: keyof NewEmployeeRow, value: string | number) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name" || field === "surname") {
        const n = field === "name" ? String(value) : prev.name;
        const s = field === "surname" ? String(value) : prev.surname;
        if (!prev.email || prev.email === autoEmail(prev.name, prev.surname))
          next.email = autoEmail(n, s);
        if (!prev.password || prev.password === autoPassword(prev.name))
          next.password = autoPassword(String(field === "name" ? value : prev.name));
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, companyId: company.id }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al crear"); return; }
      toast.success(`${form.name} ${form.surname} añadido/a`);
      onSuccess();
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Añadir empleado</h2>
          <p className="text-sm text-gray-500 mt-1">{company.name}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre <span className="text-danger-500">*</span></label>
              <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div>
              <label className="label">Apellidos</label>
              <input className="input" value={form.surname} onChange={(e) => set("surname", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Nº Seguridad Social</label>
            <input className="input font-mono" placeholder="28/12345678-90" value={form.nss} onChange={(e) => set("nss", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cargo</label>
              <input className="input" value={form.position} onChange={(e) => set("position", e.target.value)} />
            </div>
            <div>
              <label className="label">Departamento</label>
              <input className="input" value={form.department} onChange={(e) => set("department", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Horas semanales</label>
            <input type="number" className="input" min={1} max={60} value={form.weeklyHours} onChange={(e) => set("weeklyHours", Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Email (acceso) <span className="text-danger-500">*</span></label>
            <input type="email" className="input font-mono" value={form.email} onChange={(e) => set("email", e.target.value)} required />
          </div>
          <div>
            <label className="label">Contraseña inicial <span className="text-danger-500">*</span></label>
            <input className="input font-mono" value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={6} />
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn-outline flex-1" disabled={loading}>Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? "Añadiendo..." : "Añadir empleado"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Employee Modal ──────────────────────────────────────

function EditEmployeeModal({ emp, onClose, onSuccess }: {
  emp: CompanyEmployeeDto; onClose: () => void; onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: emp.email, name: emp.name, surname: emp.surname ?? "",
    nss: emp.nss ?? "", position: emp.position ?? "",
    department: emp.department ?? "", weeklyHours: emp.weeklyHours, password: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        email: form.email, name: form.name, surname: form.surname,
        nss: form.nss || null, position: form.position || null,
        department: form.department || null, weeklyHours: form.weeklyHours,
      };
      if (form.password) body.password = form.password;
      const res = await fetch(`/api/superadmin/employees/${emp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al guardar"); return; }
      toast.success("Empleado actualizado");
      onSuccess();
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Editar empleado</h2>
          <p className="text-sm text-gray-500 mt-1">{emp.name} {emp.surname}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="label">Email <span className="text-danger-500">*</span></label>
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre <span className="text-danger-500">*</span></label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Apellidos</label>
              <input className="input" value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Nº Seguridad Social</label>
            <input className="input font-mono" placeholder="28/12345678-90" value={form.nss} onChange={(e) => setForm({ ...form, nss: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cargo</label>
              <input className="input" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </div>
            <div>
              <label className="label">Departamento</label>
              <input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Horas semanales</label>
            <input type="number" className="input" min={1} max={60} value={form.weeklyHours} onChange={(e) => setForm({ ...form, weeklyHours: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Nueva contraseña <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input type="password" className="input" placeholder="Dejar en blanco para no cambiar" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} />
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn-outline flex-1" disabled={loading}>Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Change Password Modal ────────────────────────────────────

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.next !== form.confirm) {
      setError("Las contraseñas nuevas no coinciden");
      return;
    }
    if (form.next.length < 8) {
      setError("La contraseña nueva debe tener al menos 8 caracteres");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Error al cambiar contraseña"); return; }
      toast.success("Contraseña actualizada correctamente");
      onClose();
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Cambiar contraseña</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Contraseña actual <span className="text-danger-500">*</span></label>
            <input
              type="password" className="input" autoComplete="current-password"
              value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} required
            />
          </div>
          <div>
            <label className="label">Nueva contraseña <span className="text-danger-500">*</span></label>
            <input
              type="password" className="input" autoComplete="new-password"
              value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} required minLength={8}
            />
          </div>
          <div>
            <label className="label">Confirmar nueva contraseña <span className="text-danger-500">*</span></label>
            <input
              type="password" className="input" autoComplete="new-password"
              value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required
            />
          </div>
          {error && <p className="text-sm text-danger-600">{error}</p>}
          <div className="flex gap-3 pt-2 border-t">
            <button type="button" onClick={onClose} className="btn-outline flex-1" disabled={loading}>Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Create Company Modal ─────────────────────────────────────

function CreateCompanyModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState({ name: "", cif: "", address: "", postalCode: "", city: "", province: "" });
  const [employees, setEmployees] = useState<NewEmployeeRow[]>([{ ...EMPTY_ROW }]);

  function updateEmp(i: number, field: keyof NewEmployeeRow, value: string | number) {
    setEmployees((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      if (field === "name" || field === "surname") {
        const n = field === "name" ? String(value) : next[i].name;
        const s = field === "surname" ? String(value) : next[i].surname;
        if (!next[i].email || next[i].email === autoEmail(next[i].name, next[i].surname))
          next[i].email = autoEmail(n, s);
        if (!next[i].password || next[i].password === autoPassword(next[i].name))
          next[i].password = autoPassword(field === "name" ? String(value) : next[i].name);
        if (field === "name") next[i].name = String(value);
        if (field === "surname") next[i].surname = String(value);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...company, employees: employees.filter((e) => e.name.trim()) }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al crear empresa"); return; }
      toast.success(`${company.name} creada correctamente`);
      onSuccess();
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Nueva empresa</h2>
          <p className="text-sm text-gray-500 mt-1">Completa los datos y añade los empleados.</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
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
                  <input className="input" value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Código postal <span className="text-danger-500">*</span></label>
                  <input className="input font-mono" value={company.postalCode} onChange={(e) => setCompany({ ...company, postalCode: e.target.value })} required />
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
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Empleados ({employees.filter((e) => e.name.trim()).length})
                </h3>
                <button type="button" onClick={() => setEmployees((p) => [...p, { ...EMPTY_ROW }])} className="btn-outline text-xs py-1 px-3">
                  + Añadir
                </button>
              </div>
              {employees.map((emp, i) => (
                <div key={i} className="border rounded-xl p-4 space-y-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Empleado {i + 1}</span>
                    {employees.length > 1 && (
                      <button type="button" onClick={() => setEmployees((p) => p.filter((_, idx) => idx !== i))} className="text-xs text-danger-500 hover:underline">Quitar</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">Nombre <span className="text-danger-500">*</span></label>
                      <input className="input" value={emp.name} onChange={(e) => updateEmp(i, "name", e.target.value)} />
                    </div>
                    <div>
                      <label className="label text-xs">Apellidos</label>
                      <input className="input" value={emp.surname} onChange={(e) => updateEmp(i, "surname", e.target.value)} />
                    </div>
                    <div>
                      <label className="label text-xs">Nº SS</label>
                      <input className="input font-mono" value={emp.nss} onChange={(e) => updateEmp(i, "nss", e.target.value)} />
                    </div>
                    <div>
                      <label className="label text-xs">Cargo</label>
                      <input className="input" value={emp.position} onChange={(e) => updateEmp(i, "position", e.target.value)} />
                    </div>
                    <div>
                      <label className="label text-xs">Email <span className="text-danger-500">*</span></label>
                      <input className="input font-mono text-xs" value={emp.email} onChange={(e) => updateEmp(i, "email", e.target.value)} />
                    </div>
                    <div>
                      <label className="label text-xs">Contraseña <span className="text-danger-500">*</span></label>
                      <input className="input font-mono text-xs" value={emp.password} onChange={(e) => updateEmp(i, "password", e.target.value)} />
                    </div>
                    <div>
                      <label className="label text-xs">Horas/semana</label>
                      <input type="number" className="input" min={1} max={60} value={emp.weeklyHours} onChange={(e) => updateEmp(i, "weeklyHours", Number(e.target.value))} />
                    </div>
                  </div>
                </div>
              ))}
            </section>
          </div>
          <div className="p-6 border-t flex gap-3">
            <button type="button" onClick={onClose} className="btn-outline flex-1" disabled={loading}>Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? "Creando..." : "Crear empresa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
