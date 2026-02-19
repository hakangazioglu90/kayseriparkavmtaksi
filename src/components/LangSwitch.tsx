// src/components/LangSwitch.tsx
import { useI18n, type Lang } from "../i18n";

export default function LangSwitch() {
  const { lang, setLang } = useI18n();

  const btn = (l: Lang) => ({
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: lang === l ? "var(--text)" : "#fff",
    color: lang === l ? "#fff" : "var(--text)",
    fontWeight: 900,
    lineHeight: 1,
  } as const);

  return (
    <div className="row" style={{ gap: 8 }}>
      <button className="btn" style={btn("tr")} onClick={() => setLang("tr")} aria-pressed={lang === "tr"}>
        TR
      </button>
      <button className="btn" style={btn("en")} onClick={() => setLang("en")} aria-pressed={lang === "en"}>
        EN
      </button>
    </div>
  );
}
