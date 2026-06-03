"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import type { Role } from "@prisma/client";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  companyId?: string; // superadmin: create employee in a specific company
}

const ROLES = [
  { value: "EMPLOYEE", label: "Empleado/a" },
  { value: "MANAGER", label: "Administrador (RRHH)" },
];

function makeUsername(name: string, surname: string): string {
  return (name + surname)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

export function CreateEmployeeModal({ onClose, onSuccess, companyId }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    surname: "",
    role: "EMPLOYEE" as Role,
    department: "",
    position: "",
    nss: "",
    weeklyHours: 40,
    password: "",
  });

  function handleNameChange(field: "name" | "surname", value: string) {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      const n = field === "name" ? value : prev.name;
      const s = field === "surname" ? value : prev.surname;
      if (!prev.username || prev.username === makeUsername(prev.name, prev.surname)) {
        next.username = makeUsername(n, s);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.username || !formData.name || !formData.surname) {
      toast.error("Usuario, nombre y apellido son requeridos");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyId ? { ...formData, companyId } : formData),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Error al crear empleado");
        return;
      }
      toast.success(`${formData.name} ${formData.surname} creado/a`);
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
          <h2 className="text-lg font-semibold">Crear nuevo empleado/a</h2>
          <p className="text-sm text-gray-500 mt-1">
            Completa los datos para agregar un nuevo usuario al sistema.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Name & Surname */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre <span className="text-danger-500">*</span></label>
              <input
                type="text"
                className="input"
                placeholder="Juan"
                value={formData.name}
                onChange={(e) => handleNameChange("name", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Apellido <span className="text-danger-500">*</span></label>
              <input
                type="text"
                className="input"
                placeholder="García"
                value={formData.surname}
                onChange={(e) => handleNameChange("surname", e.target.value)}
                required
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="label">Usuario (acceso) <span className="text-danger-500">*</span></label>
            <input
              type="text"
              className="input font-mono uppercase"
              placeholder="JUANGARCIA"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value.toUpperCase().replace(/\s/g, "") })}
              required
            />
            <p className="text-xs text-gray-400 mt-1">Se genera automáticamente al introducir nombre y apellido.</p>
          </div>

          {/* Role */}
          <div>
            <label className="label">Rol</label>
            <select
              className="input"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* NSS */}
          <div>
            <label className="label">Nº Seguridad Social</label>
            <input
              type="text"
              className="input"
              placeholder="28/12345678-90"
              value={formData.nss}
              onChange={(e) => setFormData({ ...formData, nss: e.target.value })}
            />
          </div>

          {/* Department & Position */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Departamento</label>
              <input
                type="text"
                className="input"
                placeholder="Ingeniería"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Cargo</label>
              <input
                type="text"
                className="input"
                placeholder="Desarrollador"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              />
            </div>
          </div>

          {/* Weekly hours */}
          <div>
            <label className="label">Horas semanales contratadas</label>
            <input
              type="number"
              className="input"
              min="1"
              max="60"
              value={formData.weeklyHours}
              onChange={(e) => setFormData({ ...formData, weeklyHours: Number(e.target.value) })}
            />
          </div>

          {/* Password */}
          <div>
            <label className="label">Contraseña <span className="text-danger-500">*</span></label>
            <input
              type="password"
              className="input"
              placeholder="Mínimo 8 caracteres"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              minLength={8}
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn-outline flex-1">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? "Creando..." : "Crear empleado/a"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
