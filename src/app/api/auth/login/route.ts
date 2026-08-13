import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { signSession, setSessionCookie } from "@/lib/auth";

type EmployeeRow = {
  id: number;
  last_name: string;
  first_name: string;
  code_hash: string;
  active: boolean;
};

type AccountRow = {
  id: number;
  name: string;
  code_hash: string;
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.code !== "string" || !body.code.trim()) {
    return NextResponse.json({ error: "Code manquant." }, { status: 400 });
  }
  const code = body.code.trim();

  if (body.role === "employee") {
    const employeeId = Number(body.employeeId);
    if (!employeeId) {
      return NextResponse.json({ error: "Employé non sélectionné." }, { status: 400 });
    }

    const rows = await query<EmployeeRow>(
      "SELECT id, last_name, first_name, code_hash, active FROM employees WHERE id = $1",
      [employeeId]
    );
    const emp = rows[0];
    if (!emp || !emp.active || !(await bcrypt.compare(code, emp.code_hash))) {
      return NextResponse.json({ error: "Nom ou code invalide." }, { status: 401 });
    }

    const token = await signSession({
      sub: String(emp.id),
      role: "employee",
      name: `${emp.first_name} ${emp.last_name}`,
    });
    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, token);
    return res;
  }

  if (body.role === "provider" || body.role === "admin") {
    const table = body.role === "provider" ? "provider_accounts" : "admin_accounts";
    const rows = await query<AccountRow>(
      table === "provider_accounts"
        ? "SELECT id, name, code_hash FROM provider_accounts"
        : "SELECT id, name, code_hash FROM admin_accounts"
    );

    let matched: AccountRow | null = null;
    for (const r of rows) {
      if (await bcrypt.compare(code, r.code_hash)) {
        matched = r;
        break;
      }
    }
    if (!matched) {
      return NextResponse.json({ error: "Code invalide." }, { status: 401 });
    }

    const token = await signSession({
      sub: String(matched.id),
      role: body.role,
      name: matched.name,
    });
    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, token);
    return res;
  }

  return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
}
