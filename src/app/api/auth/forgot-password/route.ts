// POST /api/auth/forgot-password
// Looks up the employee, then emails jorge.garcia@prosersm.com asking them to reset the password.
// Always returns 200 to avoid email enumeration.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import { z } from "zod";

const ADMIN_EMAIL = "jorge.garcia@prosersm.com";

const Schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  const { email } = parsed.data;

  // Always respond OK — don't leak whether the email exists
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim(), deletedAt: null },
    select: { name: true, surname: true, email: true, company: { select: { name: true } } },
  });

  if (user) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: ADMIN_EMAIL,
        subject: `Solicitud de recuperación de contraseña — ${user.name} ${user.surname}`,
        html: `
          <p>Hola Jorge,</p>
          <p>El siguiente empleado ha solicitado recuperar su contraseña:</p>
          <ul>
            <li><strong>Nombre:</strong> ${user.name} ${user.surname}</li>
            <li><strong>Email:</strong> ${user.email}</li>
            <li><strong>Empresa:</strong> ${user.company.name}</li>
          </ul>
          <p>Por favor, accede al panel de administración y restablece su contraseña desde la sección de empleados.</p>
          <p><a href="${process.env.NEXTAUTH_URL}/superadmin">Ir al panel de superadministrador</a></p>
          <p>Saludos,<br/>Sistema de Registro de Jornada</p>
        `,
        text: `Solicitud de recuperación de contraseña\n\nEmpleado: ${user.name} ${user.surname}\nEmail: ${user.email}\nEmpresa: ${user.company.name}\n\nPor favor restablece su contraseña desde el panel de administración.`,
      });
    } catch (e) {
      // Log but don't fail — user still sees the success message
      console.error("[forgot-password] email send failed:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
