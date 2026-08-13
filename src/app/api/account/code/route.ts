import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

const CODE_RE = /^\d{4,8}$/;

// Pour l'instant réservé à l'admin : le prestataire n'a pas encore cette option en interface.
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!CODE_RE.test(code)) {
    return NextResponse.json({ error: "Le code doit contenir entre 4 et 8 chiffres." }, { status: 400 });
  }

  const hash = await bcrypt.hash(code, 10);
  await query("UPDATE admin_accounts SET code_hash = $1 WHERE id = $2", [hash, session.sub]);

  return NextResponse.json({ ok: true });
}
