"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import toast from "react-hot-toast";
import type { CompanyDto, CompanyEmployeeDto } from "@/types";

// ── Edit Request types ───────────────────────────────────────

interface EditRequestDto {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  fieldChanged: string;
  proposedValue: string;
  justification: string;
  reviewNote: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  requestedBy: { id: string; name: string; surname: string; username: string };
  reviewedBy: { name: string; surname: string; username: string } | null;
  timeLog: { id: string; workDate: string; effectiveClockIn: string; effectiveClockOut: string | null };
}

// ── Helpers ─────────────────────────────────────────────────

interface NewEmployeeRow {
  name: string; surname: string; username: string; password: string;
  nss: string; position: string; department: string; weeklyHours: number;
  role: string;
}

const EMPTY_ROW: NewEmployeeRow = {
  name: "", surname: "", username: "", password: "",
  nss: "", position: "", department: "", weeklyHours: 40, role: "EMPLOYEE",
};

const ROLES = [
  { value: "EMPLOYEE", label: "Empleado/a" },
  { value: "MANAGER", label: "Administrador (RRHH)" },
  { value: "INSPECTOR", label: "Inspector" },
];

function makeUsername(name: string, surname: string): string {
  return (name + surname)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "");
}
function autoPassword(name: string) {
  const f = name.trim().split(" ")[0].toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
  return f ? `${f}123` : "";
}

// ── Main page ───────────────────────────────────────────────

export default function SuperAdminPage() {
  const { data: session } = useSession();
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const router = useRouter();

  // edit requests
  const [editRequests, setEditRequests] = useState<EditRequestDto[]>([]);
  const [editRequestsLoading, setEditRequestsLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState<EditRequestDto | null>(null);

  const fetchEditRequests = useCallback(async () => {
    setEditRequestsLoading(true);
    try {
      const res = await fetch("/api/edit-requests?status=PENDING");
      const json = await res.json();
      if (res.ok) setEditRequests(json.data ?? []);
    } catch { /* silent */ } finally { setEditRequestsLoading(false); }
  }, []);

  useEffect(() => { fetchEditRequests(); }, [fetchEditRequests]);

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
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 border-b border-slate-800/80 px-6 py-0 flex items-center justify-between h-14 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-bold text-white tracking-tight">
              Registro<span className="text-brand-400">Jornada</span>
            </span>
            <span className="ml-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Superadmin</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-[11px] text-slate-500 font-mono">{session?.user?.username}</span>
          <button
            onClick={() => setShowChangePassword(true)}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-100 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 hover:bg-slate-800 transition-all"
          >
            Cambiar contraseña
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-100 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 hover:bg-slate-800 transition-all"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Pending edit requests ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                Solicitudes de corrección
                {editRequests.length > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold">
                    {editRequests.length}
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-500">Peticiones pendientes de empleados para corregir sus registros</p>
            </div>
          </div>

          {editRequestsLoading ? (
            <div className="card py-6 text-center text-sm text-gray-400">Cargando...</div>
          ) : editRequests.length === 0 ? (
            <div className="card py-6 text-center text-sm text-gray-400">No hay solicitudes pendientes.</div>
          ) : (
            <div className="space-y-2">
              {editRequests.map((req) => (
                <div key={req.id} className="card px-5 py-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      <span className="font-semibold text-gray-900">
                        {req.requestedBy.surname}, {req.requestedBy.name}
                      </span>
                      <span className="text-gray-400 font-mono text-xs">{req.requestedBy.username}</span>
                      <span className="badge badge-amber">Pendiente</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Registro del{" "}
                      <strong>{new Date(req.timeLog.workDate).toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</strong>
                      {" · "}
                      <strong>{req.fieldChanged === "clockIn" ? "Entrada" : "Salida"}</strong>
                      {" · "}
                      Valor actual:{" "}
                      <span className="font-mono">
                        {req.fieldChanged === "clockIn"
                          ? new Date(req.timeLog.effectiveClockIn).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
                          : req.timeLog.effectiveClockOut
                          ? new Date(req.timeLog.effectiveClockOut).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </span>
                      {" → "}
                      Propuesto:{" "}
                      <span className="font-mono font-semibold text-brand-700">
                        {new Date(req.proposedValue).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </p>
                    <p className="text-xs text-gray-600 mt-1 italic">"{req.justification}"</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Solicitado el {new Date(req.requestedAt).toLocaleString("es-ES")}
                    </p>
                  </div>
                  <button
                    onClick={() => setReviewTarget(req)}
                    className="shrink-0 btn-primary text-xs py-1.5 px-4"
                  >
                    Revisar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

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
                      onClick={() => router.push(`/superadmin/empresa/${co.id}`)}
                      className="text-xs font-semibold px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
                    >
                      Gestionar
                    </button>
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
                              <th className="px-4 py-3 text-left">Usuario</th>
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
                                <td className="px-4 py-2 text-gray-500 font-mono">{emp.username}</td>
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

      {reviewTarget && (
        <ReviewEditRequestModal
          req={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSuccess={() => { setReviewTarget(null); fetchEditRequests(); }}
        />
      )}

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
        if (!prev.username || prev.username === makeUsername(prev.name, prev.surname))
          next.username = makeUsername(n, s);
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Horas semanales</label>
              <input type="number" className="input" min={1} max={60} value={form.weeklyHours} onChange={(e) => set("weeklyHours", Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Rol</label>
              <select className="input" value={form.role} onChange={(e) => set("role", e.target.value)}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Usuario (acceso) <span className="text-danger-500">*</span></label>
            <input type="text" className="input font-mono uppercase" value={form.username} onChange={(e) => set("username", e.target.value.toUpperCase().replace(/\s/g, ""))} required />
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
    username: emp.username, name: emp.name, surname: emp.surname ?? "",
    nss: emp.nss ?? "", position: emp.position ?? "", role: emp.role,
    department: emp.department ?? "", weeklyHours: emp.weeklyHours, password: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        username: form.username, name: form.name, surname: form.surname, role: form.role,
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
            <label className="label">Usuario <span className="text-danger-500">*</span></label>
            <input type="text" className="input font-mono uppercase" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toUpperCase().replace(/\s/g, "") })} required />
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Rol</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Horas semanales</label>
              <input type="number" className="input" min={1} max={60} value={form.weeklyHours}
                onChange={(e) => setForm({ ...form, weeklyHours: Number(e.target.value) })} />
            </div>
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
        if (!next[i].username || next[i].username === makeUsername(next[i].name, next[i].surname))
          next[i].username = makeUsername(n, s);
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
                      <label className="label text-xs">Usuario <span className="text-danger-500">*</span></label>
                      <input className="input font-mono text-xs uppercase" value={emp.username} onChange={(e) => updateEmp(i, "username", e.target.value.toUpperCase().replace(/\s/g, ""))} />
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

// ── Review Edit Request Modal ────────────────────────────────

function ReviewEditRequestModal({
  req,
  onClose,
  onSuccess,
}: {
  req: EditRequestDto;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [action, setAction] = useState<"approve" | "reject" | "">("");
  const [reviewNote, setReviewNote] = useState("");
  const [loading, setLoading] = useState(false);

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!action) { toast.error("Selecciona aprobar o rechazar"); return; }
    if (reviewNote.trim().length < 5) { toast.error("La nota debe tener al menos 5 caracteres"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/edit-requests/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewNote: reviewNote.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al procesar la solicitud"); return; }
      toast.success(action === "approve" ? "Corrección aprobada y aplicada" : "Solicitud rechazada");
      onSuccess();
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Revisar solicitud de corrección</h2>
          <p className="text-sm text-gray-500 mt-1">
            {req.requestedBy.surname}, {req.requestedBy.name} ·{" "}
            {new Date(req.timeLog.workDate).toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long" })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Request details */}
          <div className="rounded-xl bg-gray-50 p-4 text-sm space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Campo</p>
                <p className="font-semibold">{req.fieldChanged === "clockIn" ? "Hora de entrada" : "Hora de salida"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Valor actual</p>
                <p className="font-mono font-medium">
                  {req.fieldChanged === "clockIn"
                    ? fmtTime(req.timeLog.effectiveClockIn)
                    : req.timeLog.effectiveClockOut ? fmtTime(req.timeLog.effectiveClockOut) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Valor propuesto</p>
                <p className="font-mono font-semibold text-brand-700">{fmtTime(req.proposedValue)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Solicitado el</p>
                <p>{new Date(req.requestedAt).toLocaleString("es-ES")}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Motivo del empleado</p>
              <p className="italic text-gray-700">"{req.justification}"</p>
            </div>
          </div>

          {/* Action choice */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAction("approve")}
              className={`py-2 rounded-xl border-2 text-sm font-semibold transition-colors ${
                action === "approve"
                  ? "border-success-500 bg-success-50 text-success-700"
                  : "border-gray-200 text-gray-500 hover:border-success-300"
              }`}
            >
              Aprobar
            </button>
            <button
              type="button"
              onClick={() => setAction("reject")}
              className={`py-2 rounded-xl border-2 text-sm font-semibold transition-colors ${
                action === "reject"
                  ? "border-danger-500 bg-danger-50 text-danger-700"
                  : "border-gray-200 text-gray-500 hover:border-danger-300"
              }`}
            >
              Rechazar
            </button>
          </div>

          <div>
            <label className="label">
              {action === "reject" ? "Motivo del rechazo" : "Nota de resolución"}{" "}
              <span className="text-danger-500">*</span>
              <span className="text-gray-400 font-normal ml-1">(quedará en el registro de auditoría)</span>
            </label>
            <textarea
              className="input resize-none h-20"
              placeholder={
                action === "reject"
                  ? "Ej: El registro ya fue corregido anteriormente. El horario indicado no coincide con el control de acceso."
                  : "Ej: Corregido conforme a parte de presencia verificado."
              }
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              required
              minLength={5}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline flex-1" disabled={loading}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !action || reviewNote.trim().length < 5}
              className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 text-white ${
                action === "reject"
                  ? "bg-danger-500 hover:bg-danger-600"
                  : "bg-success-500 hover:bg-success-600"
              }`}
            >
              {loading
                ? "Procesando..."
                : action === "approve"
                ? "Aprobar y aplicar"
                : action === "reject"
                ? "Rechazar solicitud"
                : "Confirmar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
