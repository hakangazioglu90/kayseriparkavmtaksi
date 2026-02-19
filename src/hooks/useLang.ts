// src/hooks/useLang.ts
import { useEffect, useMemo, useState } from "react";
import type { Lang } from "../i18n";

const KEY = "kpt_lang";

export function useLang() {
  const [lang, setLang] = useState<Lang>("tr");

  useEffect(() => {
    const saved = (localStorage.getItem(KEY) as Lang | null) || null;
    if (saved === "tr" || saved === "en") setLang(saved);
  }, []);

  const api = useMemo(() => {
    return {
      lang,
      setLang: (v: Lang) => {
        setLang(v);
        localStorage.setItem(KEY, v);
      },
      toggle: () => {
        const next: Lang = lang === "tr" ? "en" : "tr";
        setLang(next);
        localStorage.setItem(KEY, next);
      },
    };
  }, [lang]);

  return api;
}
