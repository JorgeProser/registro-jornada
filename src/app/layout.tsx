import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Registro de Jornada | Control Horario",
  description:
    "Sistema de control de presencia y registro de jornada laboral conforme al Real Decreto-ley 8/2019.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${manrope.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                fontSize: "13px",
                fontFamily: "var(--font-sans, system-ui)",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 20px rgba(15,23,42,0.12)",
                color: "#0f172a",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
