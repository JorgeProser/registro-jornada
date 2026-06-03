"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";

interface CompanyInfo {
  id: string;
  name: string;
  cif: string;
  city: string;
}

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ companyId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const { companyId } = params;

  const [company, setCompany] = useState<CompanyInfo | null>(null);

  useEffect(() => {
    fetch(`/api/superadmin/companies/${companyId}`)
      .then((r) => r.json())
      .then((j) => setCompany(j.data ?? null));
  }, [companyId]);

  const base = `/superadmin/empresa/${companyId}`;
  const tabs = [
    { href: base, label: "Dashboard", exact: true },
    { href: `${base}/empleados`, label: "Empleados", exact: false },
    { href: `${base}/informes`, label: "Informes", exact: false },
  ];

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950">
      {/* Company header */}
      <header className="bg-slate-900 border-b border-slate-800/80 px-4 sm:px-6 py-0 flex items-center gap-4 h-14 sticky top-0 z-30">
        <button
          onClick={() => router.push("/superadmin")}
          className="text-slate-400 hover:text-slate-100 text-sm flex items-center gap-1.5 shrink-0"
        >
          ← Superadmin
        </button>
        <div className="w-px h-5 bg-slate-700 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-white font-semibold text-sm truncate">
            {company ? company.name : "Cargando…"}
          </span>
          {company && (
            <span className="ml-2 text-slate-500 text-xs font-mono">{company.cif}</span>
          )}
        </div>
        {/* Tabs */}
        <nav className="flex items-center gap-1 shrink-0">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(t.href, t.exact)
                  ? "bg-brand-600 text-white"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </header>

      {children}
    </div>
  );
}
