import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import TopBar from "@/app/components/TopBar";
import PrestataireClient from "./PrestataireClient";
import { addDays, todayInParis } from "@/lib/dates";

export default async function PrestatairePage() {
  const session = await getSession();
  if (!session || !["provider", "admin"].includes(session.role)) {
    redirect("/login");
  }

  const today = todayInParis();
  const last7 = addDays(today, -6);

  return (
    <>
      <TopBar name={session!.name} role={session!.role} />
      <div className="page">
        <PrestataireClient today={today} historyFrom={last7} />
      </div>
    </>
  );
}
