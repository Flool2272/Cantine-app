"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const NAV_LINKS: Record<string, { href: string; label: string }[]> = {
  admin: [
    { href: "/dashboard", label: "Tableau de bord" },
    { href: "/prestataire", label: "Saisie repas" },
    { href: "/admin", label: "Employés" },
  ],
  provider: [
    { href: "/prestataire", label: "Saisie repas" },
    { href: "/dashboard", label: "Tableau de bord" },
  ],
};

export default function TopBar({ name, role }: { name: string; role: string }) {
  const router = useRouter();
  const roleLabel: Record<string, string> = {
    employee: "Employé",
    provider: "Prestataire",
    admin: "Admin",
  };

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const links = NAV_LINKS[role] ?? [];

  return (
    <div className="topbar">
      <div className="topbar-brand">🍽️ Cantine</div>
      <div className="topbar-user">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="btn">
            {l.label}
          </Link>
        ))}
        <span>
          {name} · {roleLabel[role] ?? role}
        </span>
        <button className="btn" onClick={logout}>
          Déconnexion
        </button>
      </div>
    </div>
  );
}
