"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "employee" | "provider" | "admin";
type EmployeeHit = { id: number; lastName: string; firstName: string };

const ROLE_LABEL: Record<Role, string> = {
  employee: "Employé",
  provider: "Prestataire",
  admin: "Admin",
};

const ROLE_HOME: Record<Role, string> = {
  employee: "/inscription",
  provider: "/prestataire",
  admin: "/dashboard",
};

export default function LoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("employee");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<EmployeeHit[]>([]);
  const [selected, setSelected] = useState<EmployeeHit | null>(null);
  const [showList, setShowList] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSelected(null);
    setCode("");
    setError(null);
    setQuery("");
    setHits([]);
  }, [role]);

  useEffect(() => {
    if (role !== "employee" || selected) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/employees/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setHits(data.employees);
        setShowList(true);
      }
    }, 200);
  }, [query, role, selected]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (role === "employee" && !selected) {
      setError("Sélectionnez votre nom dans la liste.");
      return;
    }
    if (!code.trim()) {
      setError("Merci de saisir votre code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          employeeId: selected?.id,
          code: code.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Connexion impossible.");
        setLoading(false);
        return;
      }
      router.push(ROLE_HOME[role]);
      router.refresh();
    } catch {
      setError("Erreur réseau, réessayez.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="tabs">
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
          <button
            key={r}
            type="button"
            className={`tab ${role === r ? "active" : ""}`}
            onClick={() => setRole(r)}
          >
            {ROLE_LABEL[r]}
          </button>
        ))}
      </div>

      {role === "employee" && (
        <div className="field autocomplete">
          <label>Votre nom</label>
          <input
            className="input"
            placeholder="Commencez à taper votre nom..."
            value={selected ? `${selected.firstName} ${selected.lastName}` : query}
            onChange={(e) => {
              setSelected(null);
              setQuery(e.target.value);
            }}
            onFocus={() => setShowList(true)}
            autoComplete="off"
          />
          {showList && !selected && hits.length > 0 && (
            <div className="autocomplete-list">
              {hits.map((h) => (
                <div
                  key={h.id}
                  className="autocomplete-item"
                  onClick={() => {
                    setSelected(h);
                    setShowList(false);
                  }}
                >
                  {h.firstName} {h.lastName}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="field">
        <label>Code personnel</label>
        <input
          className="input"
          type="password"
          inputMode="numeric"
          placeholder="••••"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>

      {error && <div className="error-text">{error}</div>}

      <button className="btn btn-primary btn-block" type="submit" disabled={loading} style={{ marginTop: 8 }}>
        {loading ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
