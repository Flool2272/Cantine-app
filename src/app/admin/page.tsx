import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import TopBar from "@/app/components/TopBar";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    redirect("/login");
  }

  return (
    <>
      <TopBar name={session!.name} role={session!.role} />
      <div className="page">
        <AdminClient />
      </div>
    </>
  );
}
