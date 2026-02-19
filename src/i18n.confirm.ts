// src/i18n.confirm.ts
import type { Lang } from "./i18n";

/**
 * Confirm-page-only TR strings (no changes to i18n.tsx DICT).
 * Usage: tc("confirm.xxx", "English fallback")
 */
const TR: Record<string, string> = {
  "confirm.missing": "Eksik bilgi.",
  "confirm.date": "Tarih",

  "confirm.badge.pending": "beklemede",
  "confirm.badge.sent": "talep gönderildi",

  "confirm.btn.back": "Geri",
  "confirm.btn.newSearch": "Yeni arama",
  "confirm.btn.viewActive": "Aktif araçları gör",
  "confirm.btn.done": "Bitti",

  "confirm.hint.pending": "Onay, bir rezervasyon talebi oluşturur (durum: beklemede).",

  "confirm.title.created": "Talep oluşturuldu",
  "confirm.desc.wait": "Sürücü yanıtı bekleniyor.",

  "confirm.bookingId": "Rezervasyon ID",
  "confirm.copy": "Kopyala",
  "confirm.copied": "Kopyalandı",
  "confirm.keepId": "Destek için bu ID'yi saklayın.",

  "confirm.creating": "Oluşturuluyor…",
  "confirm.confirm": "Onayla",

  "confirm.err.anon": "Anonim giriş başarısız",
  "confirm.err.failed": "Rezervasyon başarısız",
};

export function tConfirm(lang: Lang, key: string, fallback: string) {
  return lang === "tr" ? (TR[key] ?? fallback) : fallback;
}
