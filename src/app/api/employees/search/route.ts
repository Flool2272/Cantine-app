import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

type Row = { id: number; last_name: string; first_name: string };

// Endpoint public (utilisé avant connexion) : ne renvoie que id/nom/prénom,
// jamais de code ni de hash.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ employees: [] });
  }

  const rows = await query<Row>(
    `SELECT id, last_name, first_name FROM employees
     WHERE active = TRUE AND (last_name ILIKE $1 OR first_name ILIKE $1 OR (first_name || ' ' || last_name) ILIKE $1)
     ORDER BY last_name, first_name
     LIMIT 10`,
    [`%${q}%`]
  );

  return NextResponse.json({
    employees: rows.map((r) => ({ id: r.id, lastName: r.last_name, firstName: r.first_name })),
  });
}
