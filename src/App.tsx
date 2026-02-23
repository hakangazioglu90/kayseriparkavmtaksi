// src/App.tsx  (FULL)
import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./Pages/Home";
import Results from "./Pages/Results";
import Confirm from "./Pages/Confirm";
import ActiveVehicles from "./Pages/ActiveVehicles";
import Terms from "./Pages/Terms";
import Privacy from "./Pages/Privacy";
import Footer from "./components/Footer";
import { useI18n } from "./i18n";

function LangButtons() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="row" style={{ gap: 8, alignItems: "center" }} aria-label={t("nav.lang")}>
      <button className="btn" onClick={() => setLang("tr")} style={{ fontWeight: lang === "tr" ? 900 : 700 }}>
        {t("lang.tr")}
      </button>
      <button className="btn" onClick={() => setLang("en")} style={{ fontWeight: lang === "en" ? 900 : 700 }}>
        {t("lang.en")}
      </button>
    </div>
  );
}

function PhoneModal(props: {
  open: boolean;
  onClose: () => void;
  phoneDisplay: string;
  phoneE164: string; // "+90530..."
}) {
  const { lang } = useI18n();
  const trEn = (tr: string, en: string) => (lang === "tr" ? tr : en);

  const firstBtnRef = useRef<HTMLAnchorElement | null>(null);

  // ESC closes
  useEffect(() => {
    if (!props.open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);

    // focus first action
    setTimeout(() => firstBtnRef.current?.focus(), 0);

    // prevent background scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [props.open, props.onClose]);

  if (!props.open) return null;

  const waDigits = props.phoneE164.replace("+", "");
  const waUrl = `https://wa.me/${waDigits}`;
  const telUrl = `tel:${props.phoneE164}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={trEn("İletişim seçenekleri", "Contact options")}
      onMouseDown={(e) => {
        // click outside closes
        if (e.target === e.currentTarget) props.onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        background: "rgba(0,0,0,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
      }}
    >
      <div
        className="card"
        style={{
          width: "min(440px, 100%)",
          overflow: "hidden",
        }}
      >
        <div className="cardPad grid" style={{ gap: 12 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 950, fontSize: 18 }}>{props.phoneDisplay}</div>
            <button className="btn" onClick={props.onClose} aria-label={trEn("Kapat", "Close")}>
              ✕
            </button>
          </div>

          <div className="small" style={{ opacity: 0.85 }}>
            {trEn("Bir seçenek seçin:", "Choose an option:")}
          </div>

          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <a
              ref={firstBtnRef}
              className="btn btnPrimary"
              href={telUrl}
              style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
            >
              <span aria-hidden="true">📞</span>
              {trEn("Ara", "Call")}
            </a>

            <a
              className="btn"
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
            >
              <span aria-hidden="true">💬</span>
              WhatsApp
            </a>
          </div>

          <div className="small" style={{ opacity: 0.75 }}>
            {trEn("Dışarı tıklama, X veya ESC ile kapanır.", "Close by clicking outside, X, or ESC.")}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { t } = useI18n();

  const phoneDisplay = "+90 530 595 90 38";
  const phoneE164 = "+9053059599038";

  const [phoneOpen, setPhoneOpen] = useState(false);

  // Minimal hardening for “map overlaps header”:
  // - sticky header with high z-index
  // - ensure leaflet container stays below header
  const injectedCss = useMemo(
    () => `
      .topbar{ position: sticky; top: 0; z-index: 9999; transform: translateZ(0); }
      .topbar{ background: var(--bg, #fff); }
      .leaflet-container{ z-index: 0 !important; }
    `,
    []
  );

  return (
    <BrowserRouter>
      <style>{injectedCss}</style>

      <PhoneModal
        open={phoneOpen}
        onClose={() => setPhoneOpen(false)}
        phoneDisplay={phoneDisplay}
        phoneE164={phoneE164}
      />

      <div className="topbar">
        <div className="brandRow">
          {/* Brand/title routes to home */}
          <Link className="brand" to="/" aria-label={t("nav.search")} style={{ textDecoration: "none", color: "inherit" }}>
            <span style={{ width: 14, height: 14, borderRadius: 4, background: "var(--brand)" }} />
            <span>{t("brand.name")}</span>
          </Link>

          {/* Phone next to title + opens modal */}
          <button
            className="btn"
            onClick={() => setPhoneOpen(true)}
            aria-label={t("nav.phone") ?? "Phone"}
            title={phoneDisplay}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              fontWeight: 850,
              whiteSpace: "nowrap",
            }}
          >
            <span aria-hidden="true">📞</span>
            {phoneDisplay}
          </button>

          <div className="row" style={{ gap: 8 }}>
            <Link className="btn" to="/">
              {t("nav.search")}
            </Link>
            <Link className="btn" to="/active">
              {t("nav.active")}
            </Link>
            <LangButtons />
          </div>
        </div>
      </div>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/results" element={<Results />} />
        <Route path="/confirm" element={<Confirm />} />
        <Route path="/active" element={<ActiveVehicles />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
      </Routes>

      <Footer />
    </BrowserRouter>
  );
}