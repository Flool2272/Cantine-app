import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

type ProviderAccountRow = {
  id: number;
  name: string;
};

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await query<ProviderAccountRow>(
    "SELECT id, name FROM provider_accounts ORDER BY name"
  );

  return NextResponse.json({ accounts: rows });
}
