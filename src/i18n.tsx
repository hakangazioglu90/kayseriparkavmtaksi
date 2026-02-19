// src/i18n.tsx  (FIX: strongly-typed keys + include all keys used by Home/Terms/Privacy + keeps language selector working)
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "tr" | "en";
export type Vars = Record<string, string | number>;

const DICT = {
  // Brand / Nav
  "brand.name": { tr: "KayseriPark AVM Taksi", en: "KayseriPark AVM Taxi" },
  "brand.badge": { tr: "KayseriPark", en: "KayseriPark" },

  "nav.search": { tr: "Arama", en: "Search" },
  "nav.active": { tr: "Aktif araçlar", en: "Active vehicles" },
  "nav.terms": { tr: "Kullanım Şartları", en: "Terms of Use" },
  "nav.privacy": { tr: "Gizlilik", en: "Privacy" },
  "nav.lang": { tr: "Dil", en: "Language" },
  "lang.tr": { tr: "TR", en: "TR" },
  "lang.en": { tr: "EN", en: "EN" },

  // Stepper
  "step.search": { tr: "Arama", en: "Search" },
  "step.vehicles": { tr: "Araçlar", en: "Vehicles" },
  "step.confirm": { tr: "Onay", en: "Confirm" },

  // Common
  "common.back": { tr: "Geri", en: "Back" },
  "common.swap": { tr: "Değiştir", en: "Swap" },
  "common.search": { tr: "Ara", en: "Search" },
  "common.searching": { tr: "Aranıyor…", en: "Searching…" },
  "common.date": { tr: "Tarih", en: "Date" },
  "common.missing": { tr: "Eksik alanlar", en: "Missing fields" },

  // Home
  "home.title": { tr: "Taksi bul", en: "Find a taxi" },
  "home.desc": {
    tr: "Alış, varış ve tarihi seçin. Uygun araçları ve tahmini ücreti göreceksiniz.",
    en: "Select pickup, drop-off and date. You will see available vehicles and an estimated price.",
  },
  "home.from": { tr: "Nereden", en: "From" },
  "home.to": { tr: "Nereye", en: "To" },
  "home.ph.place": { tr: "İl / ilçe / cadde…", en: "Province / district / street…" },

  // Terms / Privacy
  "terms.title": { tr: "Kullanım Şartları", en: "Terms of Use" },
  "terms.body": {
    tr:
      "Bu uygulama, taksi talebi oluşturmak için kullanılır.\n\n" +
      "• Verilen bilgiler (konum, tarih, seçilen araç) sadece talebi iletmek için kullanılır.\n" +
      "• Fiyatlar tahminidir; sürücü/işletme nihai ücreti belirleyebilir.\n" +
      "• Kötüye kullanım, otomatik istek gönderimi ve sistemi zorlayan davranışlar engellenebilir.\n" +
      "• Hizmet, uygunluk durumuna göre çalışır; araç bulunamaması mümkündür.\n",
    en:
      "This app is used to create a taxi request.\n\n" +
      "• Provided data (location, date, selected vehicle) is used only to deliver the request.\n" +
      "• Prices are estimates; driver/operator may determine the final fare.\n" +
      "• Abuse, automated requests and stress behavior may be blocked.\n" +
      "• Service depends on availability; no-vehicle cases can occur.\n",
  },

  "privacy.title": { tr: "Gizlilik Politikası", en: "Privacy Policy" },
  "privacy.body": {
    tr:
      "Bu uygulama minimum veri ile çalışacak şekilde tasarlanmıştır.\n\n" +
      "Toplanan/veri işlenen alanlar:\n" +
      "• Konum (alış/varış), tarih, seçilen araç ve talep durumu\n" +
      "• Güvenlik için anonim oturum kimliği (Firebase Auth)\n\n" +
      "Amaç:\n" +
      "• Talebi oluşturmak ve sürücüye iletmek\n" +
      "• Kötüye kullanım/istismar azaltımı\n\n" +
      "Saklama:\n" +
      "• Kayıtlar operasyonel ihtiyaç süresince tutulur.\n",
    en:
      "This app is designed to operate with minimal data.\n\n" +
      "Data processed:\n" +
      "• Pickup/dropoff, date, selected vehicle and request status\n" +
      "• Anonymous session identifier for security (Firebase Auth)\n\n" +
      "Purpose:\n" +
      "• Create and deliver the request to the driver\n" +
      "• Reduce abuse\n\n" +
      "Retention:\n" +
      "• Records are kept for operational needs.\n",
  },

  // Footer
  "footer.copy": {
    tr: "© {year} KayseriPark AVM Taksi. Tüm hakları saklıdır.",
    en: "© {year} KayseriPark AVM Taksi. All rights reserved.",
  },
  "footer.terms": { tr: "Kullanım Şartları", en: "Terms of Use" },
  "footer.privacy": { tr: "Gizlilik", en: "Privacy" },
} as const;

export type I18nKey = keyof typeof DICT;

function fmt(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

type I18nCtx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: I18nKey, vars?: Vars) => string;
};

const Ctx = createContext<I18nCtx | null>(null);
const STORAGE_KEY = "kpt_lang";

function detectInitialLang(): Lang {
  const qp = new URL(window.location.href).searchParams.get("lang");
  if (qp === "tr" || qp === "en") return qp;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "tr" || stored === "en") return stored;

  const nav = (navigator.language || "").toLowerCase();
  return nav.startsWith("tr") ? "tr" : "en";
}

export function LangProvider(props: { children: React.ReactNode }) {
  const [lang, _setLang] = useState<Lang>("tr");

  useEffect(() => {
    const initial = detectInitialLang();
    _setLang(initial);
    document.documentElement.lang = initial;
  }, []);

  const setLang = (l: Lang) => {
    _setLang(l);
    localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l;

    // Keep existing query params; just set lang
    const url = new URL(window.location.href);
    url.searchParams.set("lang", l);
    window.history.replaceState({}, "", url.toString());
  };

  const t = (key: I18nKey, vars?: Vars) => {
    const row = DICT[key];
    const raw = row?.[lang] ?? row?.en ?? key;
    return fmt(raw, vars);
  };

  const value = useMemo(() => ({ lang, setLang, t }), [lang]);

  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n must be used within <LangProvider />");
  return v;
}
