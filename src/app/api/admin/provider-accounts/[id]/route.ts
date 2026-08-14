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

  if (body.resetCode === true) {
    const code = generateCode();
    const hash = await bcrypt.hash(code, 10);
    await query("UPDATE provider_accounts SET code_hash = $1 WHERE id = $2", [hash, id]);
    return NextResponse.json({ ok: true, code });
  }

  return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
}
