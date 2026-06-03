"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = session?.user?.role;
  const name = session?.user?.name ?? "";

  const roleLabel: Record<string, string> = {
    EMPLOYEE: "Empleado/a",
    MANAGER: "RRHH / Admin",
    INSPECTOR: "Inspector Laboral",
  };

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex h-14 items-center gap-6">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center shadow-md shadow-brand-600/40">
            <ClockIcon className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="hidden sm:inline text-sm font-bold tracking-tight">
            <span className="text-white">Registro</span>
            <span className="text-brand-400">Jornada</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5 flex-1">
          {role === "MANAGER" && (
            <>
              <NavLink href="/admin" active={pathname === "/admin"}>Dashboard</NavLink>
              <NavLink href="/admin/employees" active={pathname?.startsWith("/admin/employees") ?? false}>Empleados</NavLink>
              <NavLink href="/admin/reports" active={pathname?.startsWith("/admin/reports") ?? false}>Informes</NavLink>
            </>
          )}
          {role === "INSPECTOR" && (
            <NavLink href="/inspector" active={pathname === "/inspector"}>Vista Inspector</NavLink>
          )}
          {role === "EMPLOYEE" && (
            <NavLink href="/employee" active={pathname === "/employee"}>Mi Jornada</NavLink>
          )}
        </nav>

        {/* User area */}
        <div className="flex items-center gap-3 shrink-0">
          {name && (
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-brand-950/80 border border-brand-800/60 flex items-center justify-center">
                <span className="text-brand-300 text-[10px] font-bold font-mono">{initials}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-white leading-none">{name}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{role ? roleLabel[role] : ""}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-100 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 hover:bg-slate-800 transition-all"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
  active,
}: {
  href: string;
  children: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
        active
          ? "bg-slate-800 text-white"
          : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
      }`}
    >
      {children}
    </Link>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
