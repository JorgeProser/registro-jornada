// POST /api/auth/forgot-password
// Employees don't have email accounts — password resets are handled by the admin.
// This endpoint exists so the UI can show a consistent response.

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ ok: true });
}
