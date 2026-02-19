// src/Pages/Home.tsx  (FULL)
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchPlace } from "../api/geocode";
import type { GeoPick } from "../api/geocode";
import { useI18n } from "../i18n";

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

function PlaceField(props: {
  label: string;
  value: GeoPick | null;
  onChange: (v: GeoPick | null) => void;
  placeholder: string;
}) {
  const { t } = useI18n();
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
      const res = await searchPlace(next.trim());
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
      />

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
            top: 70,
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
  const { t } = useI18n();
  const nav = useNavigate();

  const [from, setFrom] = useState<GeoPick | null>(null);
  const [to, setTo] = useState<GeoPick | null>(null);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [err, setErr] = useState("");

  const canSearch = useMemo(() => !!from && !!to && !!date, [from, to, date]);

  return (
    <div className="container">
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
              <PlaceField label={t("home.from")} value={from} onChange={setFrom} placeholder={t("home.ph.place")} />
              <PlaceField label={t("home.to")} value={to} onChange={setTo} placeholder={t("home.ph.place")} />
            </div>

            <div className="row" style={{ justifyContent: "space-between" }}>
              <div style={{ width: "min(260px, 100%)" }}>
                <div className="small" style={{ fontWeight: 900, color: "rgba(0,0,0,.7)" }}>
                  {t("common.date")}
                </div>
                <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>

              <div className="row" style={{ justifyContent: "flex-end", flex: 1 }}>
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
