import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { postTeamsMessage } from "@/lib/teams";
import { isWeekday, todayInParis } from "@/lib/dates";

// Appelé chaque matin (jours ouvrés) par le Cron Job Render défini dans render.yaml.
// Protégé par un secret partagé plutôt que par une session utilisateur.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = todayInParis();
  if (!isWeekday(today)) {
    return NextResponse.json({ skipped: "weekend" });
  }

  const [{ count: activeCount }] = await query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM employees WHERE active = TRUE"
  );
  const [{ count: registeredCount }] = await query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM registrations WHERE meal_date = $1", // employés déjà inscrits aujourd'hui
    [today]
  );

  const missing = activeCount - registeredCount;
  if (missing <= 0) {
    return NextResponse.json({ skipped: "everyone-registered", activeCount, registeredCount });
  }

  const appUrl = process.env.APP_URL ?? "";
  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${today}T12:00:00Z`));

  await postTeamsMessage(
    `🍽️ Rappel cantine — **${missing}** personne(s) ne sont pas encore inscrites pour le repas de ${formattedDate}. ` +
      `Pensez à vous inscrire avant la coupure du prestataire !${appUrl ? ` ${appUrl}` : ""}`
  );

  return NextResponse.json({ ok: true, missing });
}
