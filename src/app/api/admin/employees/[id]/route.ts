import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

function generateCode(): string {
  return String(randomInt(0, 10000)).padStart(4, "0");
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));

  if (typeof body.active === "boolean") {
    await query("UPDATE employees SET active = $1 WHERE id = $2", [body.active, id]);
    return NextResponse.json({ ok: true });
  }

  if (body.resetCode === true) {
    const code = generateCode();
    const hash = await bcrypt.hash(code, 10);
    await query("UPDATE employees SET code_hash = $1 WHERE id = $2", [hash, id]);
    return NextResponse.json({ ok: true, code });
  }

  if (typeof body.matricule === "string") {
    const matricule = body.matricule.trim() || null;
    try {
      await query("UPDATE employees SET matricule = $1 WHERE id = $2", [matricule, id]);
    } catch (err: unknown) {
      const code = (err as { code?: string } | null)?.code;
      if (code === "23505") {
        return NextResponse.json({ error: "Ce matricule est déjà utilisé par un autre employé." }, { status: 409 });
      }
      throw err;
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  await query("DELETE FROM employees WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
