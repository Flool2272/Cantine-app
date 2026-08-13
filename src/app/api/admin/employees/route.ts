import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

type EmployeeRow = { id: number; last_name: string; first_name: string; active: boolean };

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await query<EmployeeRow>(
    "SELECT id, last_name, first_name, active FROM employees ORDER BY last_name, first_name"
  );

  return NextResponse.json({
    employees: rows.map((r) => ({
      id: r.id,
      lastName: r.last_name,
      firstName: r.first_name,
      active: r.active,
    })),
  });
}

function generateCode(): string {
  return String(randomInt(0, 10000)).padStart(4, "0");
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.lines !== "string") {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const rows = body.lines
    .split("\n")
    .map((line: string) => line.trim())
    .filter(Boolean)
    .map((line: string) => line.split(/[;,\t]+/).map((p: string) => p.trim()))
    .filter((parts: string[]) => parts.length >= 2 && parts[0] && parts[1]);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Aucune ligne valide trouvée (format attendu: Nom;Prénom)." }, { status: 400 });
  }
  if (rows.length > 1000) {
    return NextResponse.json({ error: "Trop de lignes en une seule fois (max 1000)." }, { status: 400 });
  }

  const created: { lastName: string; firstName: string; code: string }[] = [];

  for (const [lastName, firstName] of rows) {
    const code = generateCode();
    const hash = await bcrypt.hash(code, 10);
    await query("INSERT INTO employees (last_name, first_name, code_hash) VALUES ($1, $2, $3)", [
      lastName,
      firstName,
      hash,
    ]);
    created.push({ lastName, firstName, code });
  }

  return NextResponse.json({ created });
}
