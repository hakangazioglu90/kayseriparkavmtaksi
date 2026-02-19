// src/i18n.results.ts
import { useI18n } from "./i18n";

export type Lang = "tr" | "en";

const KEYS = [
  "results.date",
  "results.editSearch",

  "results.kpi.distance",
  "results.kpi.available",

  "results.loading",

  "results.none.title",
  "results.none.desc",
  "results.none.change",
  "results.none.retry",

  "results.pill.available",

  "results.noImage",
  "results.noExtraImages",

  "results.pricing.base",
  "results.pricing.min",
  "results.estimatedTotal",
  "results.select",
] as const;

export type ResultsKey = (typeof KEYS)[number];

const EN: Record<ResultsKey, string> = {
  "results.date": "Date",
  "results.editSearch": "Edit search",

  "results.kpi.distance": "Distance: {km} km",
  "results.kpi.available": "Available: {n}",

  "results.loading": "Loading vehicles…",

  "results.none.title": "No available vehicles",
  "results.none.desc": "Try a different time/date, or check again later.",
  "results.none.change": "Change search",
  "results.none.retry": "Retry",

  "results.pill.available": "available",

  "results.noImage": "No image",
  "results.noExtraImages": "No extra images",

  "results.pricing.base": "base",
  "results.pricing.min": "min",
  "results.estimatedTotal": "Estimated total:",
  "results.select": "Select",
};

const TR: Record<ResultsKey, string> = {
  "results.date": "Tarih",
  "results.editSearch": "Aramayı düzenle",

  "results.kpi.distance": "Mesafe: {km} km",
  "results.kpi.available": "Uygun: {n}",

  "results.loading": "Araçlar yükleniyor…",

  "results.none.title": "Uygun araç yok",
  "results.none.desc": "Farklı bir tarih/saat deneyin veya daha sonra tekrar kontrol edin.",
  "results.none.change": "Aramayı değiştir",
  "results.none.retry": "Tekrar dene",

  "results.pill.available": "uygun",

  "results.noImage": "Görsel yok",
  "results.noExtraImages": "Ek görsel yok",

  "results.pricing.base": "Açılış",
  "results.pricing.min": "Min",
  "results.estimatedTotal": "Tahmini toplam:",
  "results.select": "Seç",
};

function fmt(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

// Isolated translator for Results page ONLY (does not touch src/i18n.tsx)
export function useResultsT() {
  const { lang } = useI18n();
  return (key: ResultsKey, vars?: Record<string, string | number>) => {
    const raw = (lang === "tr" ? TR[key] : EN[key]) ?? key;
    return fmt(raw, vars);
  };
}
