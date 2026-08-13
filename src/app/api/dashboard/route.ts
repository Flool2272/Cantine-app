import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type Row = { meal_date: string; theoretical: number; actual: number | null };

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !["admin", "provider"].includes(session.role)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json({ error: "Paramètres from/to invalides." }, { status: 400 });
  }

  const rows = await query<Row>(
    `SELECT
       gs.meal_date::date::text AS meal_date,
       COALESCE(r.theoretical, 0)::int AS theoretical,
       a.actual_count AS actual
     FROM generate_series($1::date, $2::date, interval '1 day') AS gs(meal_date)
     LEFT JOIN (
       SELECT meal_date, COUNT(*) AS theoretical
       FROM registrations
       GROUP BY meal_date
     ) r ON r.meal_date = gs.meal_date
     LEFT JOIN actual_attendance a ON a.meal_date = gs.meal_date
     WHERE EXTRACT(ISODOW FROM gs.meal_date) BETWEEN 1 AND 5
     ORDER BY gs.meal_date`,
    [from, to]
  );

  return NextResponse.json({
    days: rows.map((r) => ({
      date: r.meal_date,
      theoretical: Number(r.theoretical),
      actual: r.actual == null ? null : Number(r.actual),
    })),
  });
}
