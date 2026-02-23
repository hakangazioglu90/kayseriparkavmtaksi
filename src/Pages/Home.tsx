// src/Pages/Home.tsx  (FULL)
import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { reversePlace, searchPlace } from "../api/geocode";
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
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="small" style={{ fontWeight: 900, color: "rgba(0,0,0,.7)" }}>
          {props.label}
        </div>
        {props.action}
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
  const { t, lang } = useI18n();
  const nav = useNavigate();

  const [from, setFrom] = useState<GeoPick | null>(null);
  const [to, setTo] = useState<GeoPick | null>(null);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [err, setErr] = useState("");
  const [locating, setLocating] = useState(false);

  const canSearch = useMemo(() => !!from && !!to && !!date, [from, to, date]);
  const trEn = (tr: string, en: string) => (lang === "tr" ? tr : en);

async function setFromMyLocation() {
  setErr("");

  if (!("geolocation" in navigator)) {
    setErr(trEn("Bu cihaz konum desteklemiyor.", "This device does not support location."));
    return;
  }

  // Kayseri city-center sanity anchor (used only to reject obvious wrong-city fixes)
  const KAYSERI = { lat: 38.732219, lng: 35.485281 }; // derived from 38°43'55.99"N, 35°29'7.01"E :contentReference[oaicite:0]{index=0}
  const MAX_KM_FROM_KAYSERI = 80;

  const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const s1 = Math.sin(dLat / 2);
    const s2 = Math.sin(dLng / 2);
    const c =
      s1 * s1 +
      Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * s2 * s2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(c)));
  };

  const geoErr = (e: any) => {
    const code = Number(e?.code || 0);
    if (code === 1) return trEn("Konum izni reddedildi.", "Location permission denied.");
    if (code === 2) return trEn("Konum alınamadı.", "Position unavailable.");
    if (code === 3) return trEn("Konum alma zaman aşımı.", "Location request timed out.");
    return String(e?.message || "") || trEn("Konum alınamadı.", "Could not get location.");
  };

  setLocating(true);

  const WINDOW_MS = 12000;
  const MIN_GOOD_ACC = 80; // meters (target) :contentReference[oaicite:1]{index=1}
  const WARN_ACC = 800; // meters (warning threshold) :contentReference[oaicite:2]{index=2}

  let best: GeolocationPosition | null = null;

  const pickBest = (p: GeolocationPosition) => {
    if (!best) best = p;
    else if ((p.coords.accuracy || 1e12) < (best.coords.accuracy || 1e12)) best = p;
  };

  const finalize = async () => {
    if (!best) throw new Error(trEn("Konum alınamadı.", "Could not get location."));
    const lat = best.coords.latitude;
    const lng = best.coords.longitude;

    const accRaw = best.coords.accuracy;
    const acc = Number.isFinite(accRaw) ? Math.round(accRaw as number) : -1;

    // 1) Reject “obviously wrong city” fixes, even if browser claims small accuracy
    const kmFromKayseri = haversineKm({ lat, lng }, KAYSERI);
    if (kmFromKayseri > MAX_KM_FROM_KAYSERI) {
      setErr(
        trEn(
          `Konum Kayseri'den çok uzak görünüyor (~${kmFromKayseri.toFixed(0)} km). Lütfen adresi manuel seçin.`,
          `Location looks far from Kayseri (~${kmFromKayseri.toFixed(0)} km). Please pick manually.`
        )
      );
      return;
    }

    const pick =
      (await reversePlace(lat, lng, { lang })) ?? {
        label: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        lat,
        lng,
      };

    // Optional transparency (shows user what browser claims)
    if (acc > 0) pick.label = `${pick.label} (±${acc}m)`;

    setFrom(pick);

    // 2) Warn on low/unknown accuracy (some browsers may provide odd/0 values)
    if (acc <= 0 || acc >= WARN_ACC) {
      setErr(
        trEn(
          "Konum hassas değil (GPS/konum servislerini açın veya adresi manuel seçin).",
          "Low accuracy (enable location services or pick manually)."
        )
      );
    }
  };

  try {
    await new Promise<void>((resolve, reject) => {
      const start = Date.now();
      const watchId = navigator.geolocation.watchPosition(
        (p) => {
          pickBest(p);
          const acc = p.coords.accuracy || 1e12;
          if (acc <= MIN_GOOD_ACC || Date.now() - start >= WINDOW_MS) {
            navigator.geolocation.clearWatch(watchId);
            finalize().then(resolve).catch(reject);
          }
        },
        (e) => {
          navigator.geolocation.clearWatch(watchId);
          reject(e);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: WINDOW_MS }
      );
    });
  } catch (e: any) {
    console.warn("geolocation error:", e);
    setErr(geoErr(e));
  } finally {
    setLocating(false);
  }
}

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
              <PlaceField
                label={t("home.from")}
                value={from}
                onChange={setFrom}
                placeholder={t("home.ph.place")}
                action={
                  <button
                    className="btn"
                    onClick={setFromMyLocation}
                    disabled={locating}
                    title={trEn("Konumum", "My location")}
                  >
                    {locating ? trEn("Alınıyor…", "Locating…") : trEn("Konumum", "My location")}
                  </button>
                }
              />
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