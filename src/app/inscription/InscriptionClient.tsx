"use client";

import { useEffect, useMemo, useState } from "react";
import { workWeek, weekdayLabel } from "@/lib/dates";

export default function InscriptionClient({ today, weeks }: { today: string; weeks: string[] }) {
  const days = useMemo(() => weeks.flatMap((monday) => workWeek(monday)), [weeks]);
  const from = days[0];
  const to = days[days.length - 1];

  const [registered, setRegistered] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/registrations?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((data) => {
        setRegistered(new Set(data.dates as string[]));
        setLoading(false);
      });
  }, [from, to]);

  async function toggle(date: string) {
    const isRegistered = registered.has(date);
    setPending(date);
    const res = await fetch("/api/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, register: !isRegistered }),
    });
    if (res.ok) {
      setRegistered((prev) => {
        const next = new Set(prev);
        if (isRegistered) next.delete(date);
        else next.add(date);
        return next;
      });
    }
    setPending(null);
  }

  const todayRegistered = registered.has(today);

  return (
    <>
      {!loading && !todayRegistered && (
        <div className="banner banner-warning">
          <span>⚠️ Vous n&apos;êtes pas encore inscrit(e) pour le repas d&apos;aujourd&apos;hui.</span>
          <button className="btn btn-primary" onClick={() => toggle(today)} disabled={pending === today}>
            Je m&apos;inscris
          </button>
        </div>
      )}
      {!loading && todayRegistered && (
        <div className="banner banner-success">✅ Vous êtes inscrit(e) pour le repas d&apos;aujourd&apos;hui.</div>
      )}

      <div className="card">
        <h2>Mes inscriptions</h2>
        <p className="subtitle">Cliquez sur un jour pour vous inscrire ou vous désinscrire du repas.</p>
        <div className="day-grid">
          {days.map((date) => {
            const isToday = date === today;
            const isRegistered = registered.has(date);
            return (
              <div key={date} className={`day-card ${isToday ? "today" : ""}`}>
                {isToday && <span className="day-badge">Aujourd&apos;hui</span>}
                <span className="day-label">{weekdayLabel(date)}</span>
                <button
                  className={`btn ${isRegistered ? "btn-primary" : ""}`}
                  onClick={() => toggle(date)}
                  disabled={loading || pending === date}
                >
                  {isRegistered ? "✅ Inscrit(e)" : "Je mange à la cantine"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
