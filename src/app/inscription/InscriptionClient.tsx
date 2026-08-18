"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  firstOfMonth,
  isWeekday,
  lastDayOfMonth,
  mondayOf,
  monthLabel,
} from "@/lib/dates";

type Status = "yes" | "no";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function InscriptionClient({ today }: { today: string }) {
  const [viewMonth, setViewMonth] = useState(firstOfMonth(today));
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [anchor, setAnchor] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // Grille du mois affiché : semaines complètes (lundi -> dimanche) qui contiennent le mois.
  const weeks = useMemo(() => {
    const monthStart = viewMonth;
    const monthEnd = lastDayOfMonth(viewMonth);
    const gridStart = mondayOf(monthStart);
    const gridEnd = addDays(mondayOf(monthEnd), 6);

    const result: string[][] = [];
    let cursor = gridStart;
    while (cursor <= gridEnd) {
      const week = Array.from({ length: 7 }, (_, i) => addDays(cursor, i));
      result.push(week);
      cursor = addDays(cursor, 7);
    }
    return result;
  }, [viewMonth]);

  const gridFrom = weeks[0][0];
  const gridTo = weeks[weeks.length - 1][6];

  useEffect(() => {
    setLoading(true);
    fetch(`/api/registrations?from=${gridFrom}&to=${gridTo}`)
      .then((r) => r.json())
      .then((data) => {
        setStatuses((prev) => ({ ...prev, ...(data.statuses as Record<string, Status>) }));
        setLoading(false);
      });
  }, [gridFrom, gridTo]);

  useEffect(() => {
    function onMouseUp() {
      setDragging(false);
    }
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, []);

  function isSelectable(date: string): boolean {
    return isWeekday(date) && date >= today && date.slice(0, 7) === viewMonth.slice(0, 7);
  }

  function handleMouseDown(date: string, shiftKey: boolean) {
    if (!isSelectable(date)) return;
    if (shiftKey && anchor) {
      setFocus(date);
    } else {
      setAnchor(date);
      setFocus(date);
    }
    setDragging(true);
  }

  function handleMouseEnter(date: string) {
    if (dragging && isSelectable(date)) {
      setFocus(date);
    }
  }

  const range = useMemo(() => {
    if (!anchor || !focus) return null;
    return anchor <= focus ? [anchor, focus] : [focus, anchor];
  }, [anchor, focus]);

  const selectedDates = useMemo(() => {
    if (!range) return [];
    const [start, end] = range;
    const out: string[] = [];
    let cursor = start;
    while (cursor <= end) {
      if (isWeekday(cursor) && cursor >= today) out.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return out;
  }, [range, today]);

  function clearSelection() {
    setAnchor(null);
    setFocus(null);
  }

  async function applyStatus(status: Status, datesOverride?: string[]) {
    const dates = datesOverride ?? selectedDates;
    if (dates.length === 0) return;
    setApplying(true);
    setError(null);
    const res = await fetch("/api/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dates, status }),
    });
    setApplying(false);
    if (res.ok) {
      setStatuses((prev) => {
        const next = { ...prev };
        for (const d of dates) next[d] = status;
        return next;
      });
      clearSelection();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Échec de l'enregistrement.");
    }
  }

  const todayStatus = statuses[today];

  return (
    <>
      {!loading && !todayStatus && (
        <div className="banner banner-warning">
          <span>⚠️ Vous n&apos;avez pas encore répondu pour le repas d&apos;aujourd&apos;hui.</span>
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button className="btn btn-primary" onClick={() => applyStatus("yes", [today])} disabled={applying}>
              Je mange
            </button>
            <button className="btn btn-danger" onClick={() => applyStatus("no", [today])} disabled={applying}>
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

      <div className="card">
        <div className="cal-header">
          <button className="btn" onClick={() => setViewMonth(addMonths(viewMonth, -1))}>
            ← Mois précédent
          </button>
          <h2 style={{ margin: 0, textTransform: "capitalize" }}>{monthLabel(viewMonth)}</h2>
          <button className="btn" onClick={() => setViewMonth(addMonths(viewMonth, 1))}>
            Mois suivant →
          </button>
        </div>

        <p className="subtitle" style={{ marginTop: 12, marginBottom: 12 }}>
          Cliquez sur un jour, ou cliquez-glissez (ou Maj+clic) pour sélectionner une plage de jours ouvrés, puis
          choisissez « Je mange » ou « Je ne mange pas » pour toute la plage.
        </p>

        <div className="cal-grid">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="cal-weekday-label">
              {label}
            </div>
          ))}
          {weeks.flatMap((week) =>
            week.map((date) => {
              const inMonth = date.slice(0, 7) === viewMonth.slice(0, 7);
              const weekend = !isWeekday(date);
              const past = date < today;
              const isToday = date === today;
              const status = statuses[date];
              const selectable = isSelectable(date);
              const inRange = !!range && date >= range[0] && date <= range[1];

              const classes = [
                "cal-cell",
                weekend ? "weekend" : "",
                !inMonth ? "outside" : "",
                past && !weekend ? "past" : "",
                isToday ? "today" : "",
                inRange && selectable ? "in-range" : "",
                status === "yes" ? "status-yes" : "",
                status === "no" ? "status-no" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <div
                  key={date}
                  className={classes}
                  onMouseDown={(e) => handleMouseDown(date, e.shiftKey)}
                  onMouseEnter={() => handleMouseEnter(date)}
                >
                  <span className="cal-daynum">{Number(date.slice(8, 10))}</span>
                  {!weekend && inMonth && (
                    <span className="cal-status-icon">
                      {status === "yes" ? "✅" : status === "no" ? "🚫" : ""}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="legend" style={{ marginTop: 12 }}>
          <span>
            <span className="legend-dot" style={{ background: "var(--success-bg)", border: "1px solid #bfe2cf" }} />
            Je mange
          </span>
          <span>
            <span className="legend-dot" style={{ background: "#eef1f4", border: "1px solid var(--border)" }} />
            Je ne mange pas
          </span>
          <span>
            <span className="legend-dot" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
            Pas encore répondu
          </span>
        </div>

        {range && (
          <div className="cal-toolbar">
            <strong>
              {selectedDates.length} jour{selectedDates.length > 1 ? "s" : ""} sélectionné
              {selectedDates.length > 1 ? "s" : ""}
            </strong>
            <button className="btn btn-primary" onClick={() => applyStatus("yes")} disabled={applying}>
              {applying ? "..." : "Je mange"}
            </button>
            <button className="btn btn-danger" onClick={() => applyStatus("no")} disabled={applying}>
              {applying ? "..." : "Je ne mange pas"}
            </button>
            <button className="btn" onClick={clearSelection} disabled={applying}>
              Annuler la sélection
            </button>
          </div>
        )}
        {error && <div className="error-text">{error}</div>}
      </div>
    </>
  );
}
