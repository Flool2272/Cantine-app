import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import TopBar from "@/app/components/TopBar";
import DashboardClient from "./DashboardClient";
import { addDays, todayInParis } from "@/lib/dates";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session || !["admin", "provider"].includes(session.role)) {
    redirect("/login");
  }

  const today = todayInParis();
  const defaultFrom = addDays(today, -30);

  return (
    <>
      <TopBar name={session!.name} role={session!.role} />
      <div className="page">
        <DashboardClient today={today} defaultFrom={defaultFrom} />
      </div>
    </>
  );
}
