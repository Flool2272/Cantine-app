"use client";

import { useEffect, useMemo, useState } from "react";
import { workWeek, weekdayLabel, parseISO } from "@/lib/dates";

type Status = "yes" | "no";

const weekRangeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

function weekLabel(mondayIso: string, fridayIso: string): string {
  return `Semaine du ${weekRangeFormatter.format(parseISO(mondayIso))} au ${weekRangeFormatter.format(
    parseISO(fridayIso)
  )}`;
}

export default function InscriptionClient({ today, weeks }: { today: string; weeks: string[] }) {
  const weeksData = useMemo(() => weeks.map((monday) => ({ monday, days: workWeek(monday) })), [weeks]);
  const days = useMemo(() => weeksData.flatMap((w) => w.days), [weeksData]);
  const from = days[0];
  const to = days[days.length - 1];

  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/registrations?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((data) => {
        setStatuses(data.statuses as Record<string, Status>);
        setLoading(false);
      });
  }, [from, to]);

  async function setStatus(date: string, status: Status) {
    setPending(date);
    const res = await fetch("/api/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, status }),
    });
    if (res.ok) {
      setStatuses((prev) => ({ ...prev, [date]: status }));
    }
    setPending(null);
  }

  const todayStatus = statuses[today];

  return (
    <>
      {!loading && !todayStatus && (
        <div className="banner banner-warning">
          <span>⚠️ Vous n&apos;avez pas encore répondu pour le repas d&apos;aujourd&apos;hui.</span>
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button className="btn btn-primary" onClick={() => setStatus(today, "yes")} disabled={pending === today}>
              Je mange
            </button>
            <button className="btn btn-danger" onClick={() => setStatus(today, "no")} disabled={pending === today}>
              Je ne mange pas
            </button>
          </div>
        </div>
      )}
      {!loading && todayStatus === "yes" && (
        <div className="banner banner-success">✅ Vous mangez à la cantine aujourd&apos;hui.</div>
      )}
      {!loading && todayStatus === "no" && (
        <div className="banner banner-muted">🚫 Vous ne mangez pas à la cantine aujourd&apos;hui.</div>
      )}

      {weeksData.map(({ monday, days: weekDays }) => (
        <div className="card" key={monday}>
          <h2>{weekLabel(weekDays[0], weekDays[weekDays.length - 1])}</h2>
          <div className="day-grid">
            {weekDays.map((date) => {
              const isToday = date === today;
              const status = statuses[date];
              return (
                <div key={date} className={`day-card ${isToday ? "today" : ""}`}>
                  {isToday && <span className="day-badge">Aujourd&apos;hui</span>}
                  <span className="day-label">{weekdayLabel(date)}</span>
                  {!status && (
                    <span className="badge badge-warn" style={{ alignSelf: "flex-start" }}>
                      Pas encore répondu
                    </span>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className={`btn ${status === "yes" ? "btn-primary" : ""}`}
                      style={{ flex: 1 }}
                      onClick={() => setStatus(date, "yes")}
                      disabled={loading || pending === date}
                    >
                      {status === "yes" ? "✅ Je mange" : "Je mange"}
                    </button>
                    <button
                      className={`btn ${status === "no" ? "btn-danger" : ""}`}
                      style={{ flex: 1 }}
                      onClick={() => setStatus(date, "no")}
                      disabled={loading || pending === date}
                    >
                      {status === "no" ? "🚫 Je ne mange pas" : "Ne mange pas"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
