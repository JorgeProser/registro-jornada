"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const error = params.get("error");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        username: username.toUpperCase().trim(),
        password,
        redirect: false,
      });
      if (res?.error) {
        toast.error("Usuario o contraseña incorrectos");
      } else {
        router.push("/");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-brand-600/8 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[250px] bg-brand-800/10 blur-[90px] rounded-full" />
      </div>

      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      <div className="relative z-10 w-full max-w-[400px]">

        {/* Logo + title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 shadow-2xl shadow-brand-600/30 mb-5">
            <ClockIcon className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-[22px] font-bold text-white tracking-tight">
            Registro de Jornada
          </h1>
          <p className="text-slate-400 text-sm mt-1.5 font-medium">
            Control horario · RD-ley 8/2019
          </p>
        </div>

        {/* Form card */}
        <div
          className="bg-white rounded-2xl p-8"
          style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)" }}
        >
          {error && (
            <div className="mb-6 rounded-xl bg-danger-50 border border-danger-100 px-4 py-3 text-sm text-danger-700 flex items-center gap-2.5">
              <span>⚠</span>
              Error de autenticación. Inténtalo de nuevo.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label" htmlFor="username">Usuario</label>
              <input
                id="username"
                type="text"
                className="input font-mono uppercase"
                placeholder="NOMBREAPELLIDO"
                value={username}
                onChange={(e) => setUsername(e.target.value.toUpperCase())}
                required
                autoComplete="username"
                autoCapitalize="characters"
              />
            </div>

            <div>
              <label className="label" htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-[13px] mt-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <SpinnerIcon className="w-4 h-4 animate-spin" />
                  Accediendo...
                </span>
              ) : (
                "Iniciar sesión"
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-center text-[11px] text-slate-400 leading-relaxed">
              Acceso restringido a empleados autorizados
              <br />
              Sin autenticación biométrica · Conforme con RGPD y AEPD
            </p>
          </div>
        </div>

        {/* Forgot password */}
        <button
          type="button"
          onClick={() => setShowForgot(true)}
          className="w-full text-center text-[11px] text-slate-500 hover:text-slate-300 mt-5 transition-colors font-medium"
        >
          He olvidado mi contraseña
        </button>
      </div>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm"
        style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.3)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Recuperar contraseña</h2>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Las contraseñas son gestionadas por el administrador. Contacta con Jorge García
            para restablecer la tuya.
          </p>
          <button onClick={onClose} className="btn-primary w-full mt-1">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
