import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "employee") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json({ error: "Paramètres from/to invalides." }, { status: 400 });
  }

  const rows = await query<{ meal_date: string }>(
    "SELECT meal_date::text FROM registrations WHERE employee_id = $1 AND meal_date BETWEEN $2 AND $3",
    [session.sub, from, to]
  );

  return NextResponse.json({ dates: rows.map((r) => r.meal_date) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "employee") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !DATE_RE.test(body.date) || typeof body.register !== "boolean") {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (body.register) {
    await query(
      `INSERT INTO registrations (employee_id, meal_date)
       VALUES ($1, $2)
       ON CONFLICT (employee_id, meal_date) DO NOTHING`,
      [session.sub, body.date]
    );
  } else {
    await query("DELETE FROM registrations WHERE employee_id = $1 AND meal_date = $2", [
      session.sub,
      body.date,
    ]);
  }

  return NextResponse.json({ ok: true });
}
