"use client";

import { useEffect, useState } from "react";
import { weekdayLabel } from "@/lib/dates";

type DayRow = { date: string; theoretical: number; actual: number | null };

export default function PrestataireClient({
  today,
  historyFrom,
}: {
  today: string;
  historyFrom: string;
}) {
  const [date, setDate] = useState(today);
  const [theoretical, setTheoretical] = useState<number | null>(null);
  const [actual, setActual] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<DayRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  async function loadHistory() {
    setHistoryLoading(true);
    const res = await fetch(`/api/dashboard?from=${historyFrom}&to=${today}`);
    if (res.ok) {
      const data = await res.json();
      setHistory(data.days.slice().reverse());
    }
    setHistoryLoading(false);
  }

  async function loadDay(d: string) {
    setMessage(null);
    const res = await fetch(`/api/attendance/theoretical?date=${d}`);
    if (res.ok) {
      const data = await res.json();
      setTheoretical(data.theoretical);
      setActual(data.actual != null ? String(data.actual) : "");
    }
  }

  useEffect(() => {
    loadDay(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (actual === "" || Number.isNaN(Number(actual))) {
      setMessage("Merci de saisir un nombre valide.");
      return;
    }
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/attendance/actual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, actualCount: Number(actual) }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Enregistré.");
      loadHistory();
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "Erreur lors de l'enregistrement.");
    }
  }

  return (
    <>
      <div className="card">
        <h2>Saisie du nombre de repas servis</h2>
        <p className="subtitle">Comparez en direct le nombre réel de présents avec le nombre d&apos;inscrits.</p>
        <form onSubmit={submit}>
          <div className="toolbar">
            <div className="field">
              <label>Date</label>
              <input
                className="input"
                type="date"
                value={date}
                max={today}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Inscrits (théorique)</label>
              <input className="input" value={theoretical ?? "..."} disabled />
            </div>
            <div className="field">
              <label>Présents réels</label>
              <input
                className="input"
                type="number"
                min={0}
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                placeholder="Nombre de repas servis"
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
        {message && <div className="helper">{message}</div>}
      </div>

      <div className="card">
        <h2>7 derniers jours</h2>
        {historyLoading ? (
          <p className="muted">Chargement...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Jour</th>
                <th>Inscrits</th>
                <th>Réels</th>
                <th>Taux</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => {
                const rate = row.actual != null && row.theoretical > 0 ? row.actual / row.theoretical : null;
                return (
                  <tr key={row.date}>
                    <td>{weekdayLabel(row.date)}</td>
                    <td>{row.theoretical}</td>
                    <td>{row.actual ?? <span className="muted">non saisi</span>}</td>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
