"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const isVerify = params.get("verify") === "true";
  const error = params.get("error");

  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      });
      if (res?.error) {
        toast.error("Email o contraseña incorrectos");
      } else {
        router.push("/");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn("email", { email: email.toLowerCase().trim(), redirect: false });
      toast.success("Enlace de acceso enviado. Revisa tu correo electrónico.");
    } catch {
      toast.error("Error al enviar el enlace. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 to-brand-700 p-4">
      <div className="w-full max-w-md">
        {/* Logo / title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
            <ClockIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Registro de Jornada</h1>
          <p className="text-brand-200 text-sm mt-1">Control horario · RD-ley 8/2019</p>
        </div>

        <div className="card p-8">
          {isVerify && (
            <div className="mb-6 rounded-lg bg-success-500/10 border border-success-500/20 p-4 text-sm text-success-600">
              ✓ Revisa tu correo electrónico para el enlace de acceso.
            </div>
          )}
          {error && (
            <div className="mb-6 rounded-lg bg-danger-500/10 border border-danger-500/20 p-4 text-sm text-danger-600">
              Error de autenticación. Inténtalo de nuevo.
            </div>
          )}

          {/* Mode tabs */}
          <div className="flex rounded-lg border bg-gray-50 p-1 mb-6">
            <button
              onClick={() => setMode("password")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === "password"
                  ? "bg-white shadow text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Contraseña
            </button>
            <button
              onClick={() => setMode("magic")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === "magic"
                  ? "bg-white shadow text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Enlace mágico
            </button>
          </div>

          <form onSubmit={mode === "password" ? handleCredentials : handleMagicLink} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="tu@empresa.es"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {mode === "password" && (
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
                  minLength={8}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-base"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <SpinnerIcon className="w-4 h-4 animate-spin" /> Accediendo...
                </span>
              ) : mode === "password" ? (
                "Iniciar sesión"
              ) : (
                "Enviar enlace de acceso"
              )}
            </button>

            {mode === "password" && (
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="w-full text-center text-xs text-brand-600 hover:underline mt-1"
              >
                He olvidado mi contraseña
              </button>
            )}
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            Acceso restringido a empleados autorizados.
            <br />
            Sin autenticación biométrica · Conforme con RGPD y AEPD.
          </p>
        </div>
      </div>

      {showForgot && (
        <ForgotPasswordModal onClose={() => setShowForgot(false)} />
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-brand-900 to-brand-700" />}>
      <LoginForm />
    </Suspense>
  );
}

const ADMIN_EMAIL = "jorge.garcia@prosersm.com";

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Recuperar contraseña</h2>
        </div>

        {sent ? (
          <div className="p-6 space-y-4">
            <div className="rounded-lg bg-success-500/10 border border-success-500/20 p-4 text-sm text-success-700">
              ✓ Tu solicitud ha sido enviada al administrador. En breve recibirás una nueva contraseña.
            </div>
            <p className="text-sm text-gray-600">
              También puedes contactar directamente con el administrador:
            </p>
            <a
              href={`mailto:${ADMIN_EMAIL}`}
              className="block text-center text-sm font-medium text-brand-600 hover:underline"
            >
              {ADMIN_EMAIL}
            </a>
            <button onClick={onClose} className="btn-primary w-full mt-2">Cerrar</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Introduce tu email y notificaremos al administrador para que restablezca tu contraseña.
            </p>
            <div>
              <label className="label">Tu correo electrónico</label>
              <input
                type="email"
                className="input"
                placeholder="tu@empresa.es"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-400">
              También puedes contactar directamente con el administrador en{" "}
              <a href={`mailto:${ADMIN_EMAIL}`} className="text-brand-600 hover:underline">{ADMIN_EMAIL}</a>.
            </p>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-outline flex-1" disabled={loading}>
                Cancelar
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? "Enviando..." : "Enviar solicitud"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
