"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export function Navbar() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  const roleLabel: Record<string, string> = {
    EMPLOYEE: "Empleado/a",
    MANAGER: "RRHH / Admin",
    INSPECTOR: "Inspector Laboral",
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-gray-900">
          <ClockIcon className="w-5 h-5 text-brand-600" />
          <span className="hidden sm:inline">Registro de Jornada</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {role === "MANAGER" && (
            <>
              <NavLink href="/admin">Dashboard</NavLink>
              <NavLink href="/admin/employees">Empleados</NavLink>
              <NavLink href="/admin/reports">Informes</NavLink>
            </>
          )}
          {role === "INSPECTOR" && (
            <NavLink href="/inspector">Vista Inspector</NavLink>
          )}
          {role === "EMPLOYEE" && (
            <NavLink href="/employee">Mi Jornada</NavLink>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-medium text-gray-800 leading-none">
              {session?.user?.name}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {role ? roleLabel[role] : ""}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="btn-outline text-xs px-3 py-1.5"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
    >
      {children}
    </Link>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
