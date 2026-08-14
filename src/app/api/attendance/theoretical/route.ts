import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !["provider", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const date = req.nextUrl.searchParams.get("date");
  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "Paramètre date invalide." }, { status: 400 });
  }

  const [{ count }] = await query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM registrations WHERE meal_date = $1 AND status = 'yes'",
    [date]
  );
  const [actualRow] = await query<{ actual_count: number }>(
    "SELECT actual_count FROM actual_attendance WHERE meal_date = $1",
    [date]
  );

  return NextResponse.json({
    theoretical: count,
    actual: actualRow ? actualRow.actual_count : null,
  });
}
