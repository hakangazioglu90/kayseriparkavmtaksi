// src/lib/date.ts
// Fixes UTC date bug from new Date().toISOString().slice(0,10) on TR timezones
export function todayLocalISO(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}
