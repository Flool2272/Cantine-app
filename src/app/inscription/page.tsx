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
  const nextMonday = addDays(currentMonday, 7);

  return (
    <>
      <TopBar name={session!.name} role={session!.role} />
      <div className="page">
        <InscriptionClient today={today} weeks={[currentMonday, nextMonday]} />
      </div>
    </>
  );
}
