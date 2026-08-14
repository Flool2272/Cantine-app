import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = new Set(["yes", "no"]);

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

  const rows = await query<{ meal_date: string; status: string }>(
    `SELECT meal_date::date::text AS meal_date, status
     FROM registrations
     WHERE employee_id = $1 AND meal_date BETWEEN $2 AND $3`,
    [session.sub, from, to]
  );

  const statuses: Record<string, "yes" | "no"> = {};
  for (const r of rows) statuses[r.meal_date] = r.status === "no" ? "no" : "yes";

  return NextResponse.json({ statuses });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "employee") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !DATE_RE.test(body.date) || typeof body.status !== "string" || !STATUSES.has(body.status)) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  await query(
    `INSERT INTO registrations (employee_id, meal_date, status)
     VALUES ($1, $2, $3)
     ON CONFLICT (employee_id, meal_date) DO UPDATE SET status = EXCLUDED.status`,
    [session.sub, body.date, body.status]
  );

  return NextResponse.json({ ok: true });
}
