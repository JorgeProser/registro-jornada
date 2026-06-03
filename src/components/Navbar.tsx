"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = session?.user?.role;
  const name = session?.user?.name ?? "";
  const companyName = session?.user?.companyName ?? "";
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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
          {/* Dark mode toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
              aria-label="Cambiar tema"
            >
              {theme === "dark" ? (
                <SunIcon className="w-4 h-4" />
              ) : (
                <MoonIcon className="w-4 h-4" />
              )}
            </button>
          )}

          {name && (
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-brand-950/80 border border-brand-800/60 flex items-center justify-center">
                <span className="text-brand-300 text-[10px] font-bold font-mono">{initials}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-white leading-none">{name}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {role ? roleLabel[role] : ""}
                  {companyName && (
                    <span className="text-brand-400 font-semibold"> · {companyName}</span>
                  )}
                </p>
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

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
  );
}
