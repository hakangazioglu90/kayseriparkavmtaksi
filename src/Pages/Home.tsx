// src/Pages/Home.tsx  (FULL) — updated to use PickToMapModal for "to"
import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { searchPlace } from "../api/geocode";
import type { GeoPick } from "../api/geocode";
import { useI18n } from "../i18n";
import { PickFromMapModal } from "../components/PickFromMapModal";
import { PickToMapModal } from "../components/PickToMapModal";

function Stepper() {
  const { t } = useI18n();
  return (
    <div className="stepper" aria-label="Steps">
      <div className="step stepActive">
        <span className="dot">1</span> {t("step.search")}
      </div>
      <div className="step">
        <span className="dot">2</span> {t("step.vehicles")}
      </div>
      <div className="step">
        <span className="dot">3</span> {t("step.confirm")}
      </div>
    </div>
  );
}

function IconCrosshair({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 2v3m0 14v3M2 12h3m14 0h3M12 7a5 5 0 1 0 0 10a5 5 0 0 0 0-10Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M12 11v2m-1-1h2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PlaceField(props: {
  label: string;
  value: GeoPick | null;
  onChange: (v: GeoPick | null) => void;
  placeholder: string;
  action?: ReactNode;
}) {
  const { t, lang } = useI18n();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<GeoPick[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const display = props.value?.label || q;

  async function runSearch(next: string) {
    setQ(next);
    props.onChange(null);

    if (next.trim().length < 3) {
      setItems([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      const res = await searchPlace(next.trim(), { lang });
      setItems(res);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 6, position: "relative" }}>
      <div className="small" style={{ fontWeight: 900, color: "rgba(0,0,0,.7)" }}>
        {props.label}
      </div>

      <div className="row" style={{ gap: 8, alignItems: "stretch" }}>
        <input
          className="input"
          value={display}
          placeholder={props.placeholder}
          onChange={(e) => runSearch(e.target.value)}
          onFocus={() => items.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          autoComplete="off"
          inputMode="search"
          aria-label={props.label}
          aria-expanded={open}
          aria-autocomplete="list"
          style={{ flex: 1 }}
        />

        {props.action ? <div style={{ display: "flex", alignItems: "stretch" }}>{props.action}</div> : null}
      </div>

      {loading && (
        <div className="small" aria-live="polite">
          {t("common.searching")}
        </div>
      )}

      {open && items.length > 0 && (
        <div
          className="card"
          role="listbox"
          style={{
            position: "absolute",
            top: 74,
            left: 0,
            right: 0,
            maxHeight: 260,
            overflow: "auto",
            zIndex: 30,
          }}
        >
          {items.map((it, idx) => (
            <button
              key={`${it.lat}-${it.lng}-${idx}`}
              className="btn"
              role="option"
              style={{
                width: "100%",
                textAlign: "left",
                border: "0",
                borderBottom: idx === items.length - 1 ? "0" : "1px solid var(--border)",
                borderRadius: 0,
                padding: "12px 12px",
                background: "#fff",
              }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                props.onChange(it);
                setQ("");
                setOpen(false);
              }}
            >
              <div style={{ fontWeight: 850 }}>{it.label}</div>
              <div className="small">
                {it.lat.toFixed(5)}, {it.lng.toFixed(5)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const { t, lang } = useI18n();
  const nav = useNavigate();

  const [from, setFrom] = useState<GeoPick | null>(null);
  const [to, setTo] = useState<GeoPick | null>(null);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [err, setErr] = useState("");

  const [pickFromOpen, setPickFromOpen] = useState(false);
  const [pickToOpen, setPickToOpen] = useState(false);

  const canSearch = useMemo(() => !!from && !!to && !!date, [from, to, date]);
  const trEn = (tr: string, en: string) => (lang === "tr" ? tr : en);

  return (
    <div className="container">
      <PickFromMapModal
        open={pickFromOpen}
        initial={from ? { lat: from.lat, lng: from.lng } : null}
        onClose={() => setPickFromOpen(false)}
        onPick={(pick) => {
          setErr("");
          setFrom(pick);
        }}
      />

      <PickToMapModal
        open={pickToOpen}
        initial={to ? { lat: to.lat, lng: to.lng } : null}
        onClose={() => setPickToOpen(false)}
        onPick={(pick) => {
          setErr("");
          setTo(pick);
        }}
      />

      <div className="grid" style={{ gap: 12 }}>
        <div className="card">
          <div className="cardPad grid" style={{ gap: 10 }}>
            <Stepper />
            <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
              <h1 className="h1">{t("home.title")}</h1>
              <span className="badge">{t("brand.badge")}</span>
            </div>
            <p className="p">{t("home.desc")}</p>
          </div>
        </div>

        <div className="card">
          <div className="cardPad grid" style={{ gap: 12 }}>
            <div className="grid2">
              <PlaceField
                label={t("home.from")}
                value={from}
                onChange={setFrom}
                placeholder={t("home.ph.place")}
                action={
                  <button
                    className="btn"
                    onClick={() => setPickFromOpen(true)}
                    title={trEn("Haritadan seç", "Pick from map")}
                    aria-label={trEn("Haritadan seç", "Pick from map")}
                    style={{ minWidth: 46, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <IconCrosshair />
                  </button>
                }
              />

              <PlaceField
                label={t("home.to")}
                value={to}
                onChange={setTo}
                placeholder={t("home.ph.place")}
                action={
                  <button
                    className="btn"
                    onClick={() => setPickToOpen(true)}
                    title={trEn("Haritadan seç", "Pick from map")}
                    aria-label={trEn("Haritadan seç", "Pick from map")}
                    style={{ minWidth: 46, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <IconCrosshair />
                  </button>
                }
              />
            </div>

            <div className="row" style={{ justifyContent: "flex-end", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
  {/* Date picker: to the left of the buttons, aligned to the right */}
  <div style={{ width: "min(260px, 100%)" }}>
    <div className="small" style={{ fontWeight: 900, color: "rgba(0,0,0,.7)" }}>
      {t("common.date")}
    </div>
    <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
  </div>

  {/* Buttons: stay rightmost */}
  <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
    <button
      className="btn"
      onClick={() => {
        const f = from;
        const tt = to;
        setFrom(tt);
        setTo(f);
      }}
      disabled={!from && !to}
      title={t("common.swap")}
    >
      {t("common.swap")}
    </button>

    <button
      className="btn btnPrimary"
      disabled={!canSearch}
      onClick={() => {
        setErr("");
        if (!from || !to || !date) {
          setErr(t("common.missing"));
          return;
        }
        nav("/results", { state: { from, to, date } });
      }}
    >
      {t("common.search")}
    </button>
  </div>
</div>

            {err && <div style={{ color: "var(--bad)", fontWeight: 800 }}>{err}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}