import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["provider", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const actualCount = Number(body?.actualCount);
  if (!body || !DATE_RE.test(body.date) || Number.isNaN(actualCount) || actualCount < 0) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  await query(
    `INSERT INTO actual_attendance (meal_date, actual_count, entered_by, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (meal_date) DO UPDATE SET actual_count = $2, entered_by = $3, updated_at = now()`,
    [body.date, Math.round(actualCount), session.name]
  );

  return NextResponse.json({ ok: true });
}
