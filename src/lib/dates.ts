// Toutes les dates "métier" sont manipulées en tant que chaînes ISO (YYYY-MM-DD).
// En interne on les représente avec un Date construit en UTC minuit pour éviter
// tout décalage lié au fuseau horaire du serveur.

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return formatISO(d);
}

export function mondayOf(iso: string): string {
  const d = parseISO(iso);
  const dow = d.getUTCDay(); // 0=dimanche, 1=lundi, ...
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + diff);
  return formatISO(d);
}

export function isWeekday(iso: string): boolean {
  const dow = parseISO(iso).getUTCDay();
  return dow >= 1 && dow <= 5;
}

export function workWeek(mondayIso: string): string[] {
  return [0, 1, 2, 3, 4].map((offset) => addDays(mondayIso, offset));
}

export function weekdayLabel(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(parseISO(iso));
}

export function shortLabel(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(parseISO(iso));
}

// "Aujourd'hui" côté Europe/Paris, indépendamment du fuseau horaire du serveur
// (les instances Render tournent en UTC).
export function todayInParis(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
