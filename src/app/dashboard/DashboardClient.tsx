"use client";

import { useEffect, useMemo, useState } from "react";
import { shortLabel, weekdayLabel } from "@/lib/dates";

type DayRow = { date: string; theoretical: number; actual: number | null };

export default function DashboardClient({ today, defaultFrom }: { today: string; defaultFrom: string }) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(today);
  const [days, setDays] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((data) => {
        setDays(data.days);
        setLoading(false);
      });
  }, [from, to]);

  const kpis = useMemo(() => {
    const withActual = days.filter((d) => d.actual != null);
    const totalTheoretical = days.reduce((s, d) => s + d.theoretical, 0);
    const totalActual = withActual.reduce((s, d) => s + (d.actual ?? 0), 0);
    const avgRate =
      withActual.length > 0
        ? withActual.reduce((s, d) => s + (d.theoretical > 0 ? (d.actual ?? 0) / d.theoretical : 1), 0) /
          withActual.length
        : null;
    const missing = days.length - withActual.length;
    return { totalTheoretical, totalActual, avgRate, missing, daysCount: days.length };
  }, [days]);

  const maxValue = Math.max(1, ...days.map((d) => Math.max(d.theoretical, d.actual ?? 0)));

  return (
    <>
      <div className="card">
        <h2>Période</h2>
        <div className="toolbar">
          <div className="field">
            <label>Du</label>
            <input className="input" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field">
            <label>Au</label>
            <input className="input" type="date" value={to} max={today} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="value">{kpis.avgRate != null ? `${Math.round(kpis.avgRate * 100)}%` : "—"}</div>
          <div className="label">Taux de présence moyen</div>
        </div>
        <div className="kpi">
          <div className="value">{kpis.totalTheoretical}</div>
          <div className="label">Total inscrits (théorique)</div>
        </div>
        <div className="kpi">
          <div className="value">{kpis.totalActual}</div>
          <div className="label">Total présents réels</div>
        </div>
        <div className="kpi">
          <div className="value">{kpis.missing}</div>
          <div className="label">Jours sans saisie prestataire</div>
        </div>
      </div>

      <div className="card">
        <h2>Inscrits vs présents réels</h2>
        {loading ? (
          <p className="muted">Chargement...</p>
        ) : (
          <>
            <div className="bar-chart">
              {days.map((d) => (
                <div className="bar-group" key={d.date}>
                  <div className="bar-pair">
                    <div
                      className="bar bar-theoretical"
                      style={{ height: `${(d.theoretical / maxValue) * 100}%` }}
                      title={`Inscrits: ${d.theoretical}`}
                    />
                    <div
                      className="bar bar-actual"
                      style={{ height: `${((d.actual ?? 0) / maxValue) * 100}%` }}
                      title={`Réels: ${d.actual ?? "non saisi"}`}
                    />
                  </div>
                  <span className="bar-date">{shortLabel(d.date)}</span>
                </div>
              ))}
            </div>
            <div className="legend">
              <span>
                <span className="legend-dot" style={{ background: "#a9c7bb" }} />
                Inscrits (théorique)
              </span>
              <span>
                <span className="legend-dot" style={{ background: "#1f6f50" }} />
                Présents réels
              </span>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2>Détail par jour</h2>
        <table>
          <thead>
            <tr>
              <th>Jour</th>
              <th>Inscrits</th>
              <th>Réels</th>
              <th>Taux</th>
              <th>Écart</th>
            </tr>
          </thead>
          <tbody>
            {days
              .slice()
              .reverse()
              .map((d) => {
                const rate = d.actual != null && d.theoretical > 0 ? d.actual / d.theoretical : null;
                const gap = d.actual != null ? d.actual - d.theoretical : null;
                return (
                  <tr key={d.date}>
                    <td>{weekdayLabel(d.date)}</td>
                    <td>{d.theoretical}</td>
                    <td>{d.actual ?? <span className="muted">non saisi</span>}</td>
                    <td>
                      {rate == null ? (
                        <span className="muted">—</span>
                      ) : (
                        <span
                          className={`badge ${
                            rate >= 0.9 ? "badge-good" : rate >= 0.75 ? "badge-warn" : "badge-bad"
                          }`}
                        >
                          {Math.round(rate * 100)}%
                        </span>
                      )}
                    </td>
                    <td>{gap == null ? <span className="muted">—</span> : gap > 0 ? `+${gap}` : gap}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </>
  );
}
