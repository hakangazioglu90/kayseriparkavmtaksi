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

function IconPhone({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M6.5 3.5l3 2.3c.6.5.8 1.3.4 2l-1.1 2c-.2.4-.2.9.1 1.3c1.2 1.7 2.6 3.1 4.3 4.3c.4.3.9.3 1.3.1l2-1.1c.7-.4 1.5-.2 2 .4l2.3 3c.6.7.5 1.8-.2 2.4c-1.1 1-2.6 1.5-4.2 1.3c-6.3-.8-11.3-5.8-12.1-12.1c-.2-1.6.3-3.1 1.3-4.2c.6-.7 1.7-.8 2.4-.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconWhatsApp({ size = 22 }: { size?: number }) {
  // Generic chat+phone mark (WhatsApp-like without text)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M20 11.5A7.5 7.5 0 0 1 8.9 18.2L5 19l.9-3.8A7.5 7.5 0 1 1 20 11.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M10 9.8c.2-.5.7-.8 1.2-.6l.8.3c.4.2.6.6.5 1l-.2.6c.6.9 1.3 1.6 2.2 2.2l.6-.2c.4-.1.8.1 1 .5l.3.8c.2.5-.1 1-.6 1.2c-1 .4-2.7.1-4.5-1.6c-1.7-1.8-2-3.5-1.6-4.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PhoneModal(props: {
  open: boolean;
  onClose: () => void;
  phoneDisplay: string;
  phoneE164: string; // "+90530..."
}) {
  const firstActionRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (!props.open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);

    setTimeout(() => firstActionRef.current?.focus(), 0);

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
      aria-label={props.phoneDisplay}
      onMouseDown={(e) => {
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
      <div className="card" style={{ width: "min(420px, 100%)", overflow: "hidden" }}>
        <div className="cardPad grid" style={{ gap: 14 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 950, fontSize: 18 }}>{props.phoneDisplay}</div>
            <button className="btn" onClick={props.onClose} aria-label="Close">
              ✕
            </button>
          </div>

          <div className="row" style={{ gap: 12, justifyContent: "center" }}>
            <a
              ref={firstActionRef}
              href={telUrl}
              className="btn btnPrimary"
              aria-label="Call"
              title="Call"
              style={{
                width: 54,
                height: 54,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
              }}
            >
              <IconPhone />
            </a>

            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="btn"
              aria-label="WhatsApp"
              title="WhatsApp"
              style={{
                width: 54,
                height: 54,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
              }}
            >
              <IconWhatsApp />
            </a>
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

      <PhoneModal open={phoneOpen} onClose={() => setPhoneOpen(false)} phoneDisplay={phoneDisplay} phoneE164={phoneE164} />

      <div className="topbar">
        <div className="brandRow">
          {/* Brand + phone as text next to brand (not a button) */}
          <div className="brand" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link to="/" aria-label={t("nav.search")} style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: "var(--brand)" }} />
              <span>{t("brand.name")}</span>
            </Link>

            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setPhoneOpen(true);
              }}
              title={phoneDisplay}
              aria-label={phoneDisplay}
              style={{
                fontWeight: 850,
                textDecoration: "underline",
                textUnderlineOffset: 3,
                color: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              {phoneDisplay}
            </a>
          </div>

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