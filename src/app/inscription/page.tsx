import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import TopBar from "@/app/components/TopBar";
import InscriptionClient from "./InscriptionClient";
import { addDays, mondayOf, todayInParis } from "@/lib/dates";

export default async function InscriptionPage() {
  const session = await getSession();
  if (!session || session.role !== "employee") {
    redirect("/login");
  }

  const today = todayInParis();
  const currentMonday = mondayOf(today);
  // Environ un mois de visibilité (5 semaines ouvrées) à partir de la semaine en cours.
  const WEEKS_AHEAD = 5;
  const weeks = Array.from({ length: WEEKS_AHEAD }, (_, i) => addDays(currentMonday, i * 7));

  return (
    <>
      <TopBar name={session!.name} role={session!.role} />
      <div className="page">
        <InscriptionClient today={today} weeks={weeks} />
      </div>
    </>
  );
}
