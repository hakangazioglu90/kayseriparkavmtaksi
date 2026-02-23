// src/Pages/Home.tsx  (FULL)
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { reversePlace, searchPlace } from "../api/geocode";
import type { GeoPick } from "../api/geocode";
import { useI18n } from "../i18n";

// Uses react-leaflet (already in project via RouteMap)
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";

type LatLng = { lat: number; lng: number };

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
  action?: ReactNode; // rendered to the right of input (aligned vertically)
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

function loadLastCenter(): LatLng | null {
  try {
    const raw = localStorage.getItem("kpt_pick_center");
    if (!raw) return null;
    const obj = JSON.parse(raw);
    const lat = Number(obj?.lat);
    const lng = Number(obj?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

function saveLastCenter(c: LatLng) {
  try {
    localStorage.setItem("kpt_pick_center", JSON.stringify({ lat: c.lat, lng: c.lng }));
  } catch {
    // ignore
  }
}

function CenterTracker(props: { onCenter: (c: LatLng) => void }) {
  useMapEvents({
    moveend: (e) => {
      const map = e.target;
      const c = map.getCenter();
      props.onCenter({ lat: c.lat, lng: c.lng });
    },
    click: (e) => {
      const map = e.target;
      map.setView(e.latlng, map.getZoom());
      props.onCenter({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function PickFromMapModal(props: {
  open: boolean;
  initial?: LatLng | null;
  onClose: () => void;
  onPick: (pick: GeoPick) => void;
}) {
  const { lang } = useI18n();
  const trEn = (tr: string, en: string) => (lang === "tr" ? tr : en);

  const mapRef = useRef<any>(null);

  const [center, setCenter] = useState<LatLng>(() => {
    return props.initial ?? loadLastCenter() ?? { lat: 39.0, lng: 35.0 }; // generic TR-ish starting point; user can search anywhere
  });

  const [q, setQ] = useState("");
  const [items, setItems] = useState<GeoPick[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const [busy, setBusy] = useState(false);
  const [findErr, setFindErr] = useState("");

  useEffect(() => {
    if (!props.open) return;
    setFindErr("");
    // If opened and we have a stored/initial center, ensure map uses it
    setTimeout(() => {
      mapRef.current?.setView?.([center.lat, center.lng], 14);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open]);

  function updateCenter(c: LatLng) {
    setCenter(c);
    saveLastCenter(c);
  }

  async function runSearch(next: string) {
    setQ(next);
    setFindErr("");

    if (next.trim().length < 3) {
      setItems([]);
      setListOpen(false);
      return;
    }

    setSearching(true);
    try {
      const res = await searchPlace(next.trim(), { lang });
      setItems(res);
      setListOpen(true);
    } finally {
      setSearching(false);
    }
  }

  async function findMeMax3s() {
    setFindErr("");

    if (!("geolocation" in navigator)) {
      setFindErr(trEn("Bu cihaz konum desteklemiyor.", "This device does not support location."));
      return;
    }

    setBusy(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 3000, // max 3 seconds as requested
        });
      });

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      mapRef.current?.setView?.([lat, lng], 16);
      updateCenter({ lat, lng });
    } catch (e: any) {
      const code = Number(e?.code || 0);
      if (code === 1) setFindErr(trEn("Konum izni reddedildi.", "Location permission denied."));
      else if (code === 2) setFindErr(trEn("Konum alınamadı.", "Position unavailable."));
      else if (code === 3) setFindErr(trEn("Zaman aşımı (3 sn).", "Timed out (3s)."));
      else setFindErr(String(e?.message || "") || trEn("Konum alınamadı.", "Could not get location."));
    } finally {
      setBusy(false);
    }
  }

  async function useThisPin() {
    setFindErr("");
    setBusy(true);
    try {
      const pick =
        (await reversePlace(center.lat, center.lng, { lang })) ?? {
          label: `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`,
          lat: center.lat,
          lng: center.lng,
        };

      props.onPick(pick);
      props.onClose();
    } catch (e: any) {
      setFindErr(String(e?.message || "") || trEn("Adres çözümlenemedi.", "Could not resolve address."));
    } finally {
      setBusy(false);
    }
  }

  if (!props.open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
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
          width: "min(920px, 100%)",
          maxHeight: "min(92vh, 980px)",
          overflow: "hidden",
        }}
      >
        <div className="cardPad grid" style={{ gap: 10 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 950, fontSize: 18 }}>{trEn("Haritadan seç", "Pick from map")}</div>
            <button className="btn" onClick={props.onClose} disabled={busy} aria-label={trEn("Kapat", "Close")}>
              ✕
            </button>
          </div>

          <div style={{ position: "relative" }}>
            <div className="row" style={{ gap: 8, alignItems: "stretch" }}>
              <input
                className="input"
                value={q}
                onChange={(e) => runSearch(e.target.value)}
                placeholder={trEn("Yer ara (örn: Melikgazi)", "Search place (e.g. Melikgazi)")}
                onFocus={() => items.length && setListOpen(true)}
                onBlur={() => setTimeout(() => setListOpen(false), 150)}
                autoComplete="off"
                inputMode="search"
                style={{ flex: 1 }}
              />
              <button className="btn" onClick={findMeMax3s} disabled={busy} title={trEn("Beni bul (3 sn)", "Find me (3s)")}>
                ⌖
              </button>
            </div>

            {searching && (
              <div className="small" style={{ marginTop: 6 }} aria-live="polite">
                {trEn("Aranıyor…", "Searching…")}
              </div>
            )}

            {listOpen && items.length > 0 && (
              <div
                className="card"
                role="listbox"
                style={{
                  position: "absolute",
                  top: 54,
                  left: 0,
                  right: 0,
                  maxHeight: 260,
                  overflow: "auto",
                  zIndex: 50,
                  background: "#fff",
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
                      mapRef.current?.setView?.([it.lat, it.lng], 16);
                      updateCenter({ lat: it.lat, lng: it.lng });
                      setQ(it.label);
                      setListOpen(false);
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

          <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)" }}>
            <MapContainer
              center={[center.lat, center.lng]}
              zoom={14}
              style={{ width: "100%", height: "min(54vh, 520px)" }}
              whenCreated={(m) => (mapRef.current = m)}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <CenterTracker onCenter={updateCenter} />
            </MapContainer>

            {/* Fixed pin at map center */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -100%)",
                pointerEvents: "none",
                zIndex: 1000,
                fontSize: 28,
                filter: "drop-shadow(0 4px 8px rgba(0,0,0,.35))",
              }}
              aria-hidden="true"
            >
              📍
            </div>

            {/* tiny crosshair center */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: 10,
                height: 10,
                borderRadius: 999,
                border: "2px solid rgba(0,0,0,.85)",
                background: "rgba(255,255,255,.6)",
                pointerEvents: "none",
                zIndex: 1000,
              }}
              aria-hidden="true"
            />
          </div>

          <div className="small" style={{ opacity: 0.85 }}>
            {trEn("Haritayı sürükleyin veya tıklayın; iğne ortayı gösterir.", "Drag or click the map; the pin marks the center.")}
            {" — "}
            {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
          </div>

          {findErr && <div style={{ color: "var(--bad)", fontWeight: 800 }}>{findErr}</div>}

          <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <button className="btn" onClick={props.onClose} disabled={busy}>
              {trEn("İptal", "Cancel")}
            </button>

            <button className="btn btnPrimary" onClick={useThisPin} disabled={busy}>
              {busy ? trEn("Seçiliyor…", "Selecting…") : trEn("Bu konumu kullan", "Use this location")}
            </button>
          </div>
        </div>
      </div>
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

  const [pickOpen, setPickOpen] = useState(false);

  const canSearch = useMemo(() => !!from && !!to && !!date, [from, to, date]);
  const trEn = (tr: string, en: string) => (lang === "tr" ? tr : en);

  const initialForPicker = useMemo<LatLng | null>(() => {
    if (from) return { lat: from.lat, lng: from.lng };
    const last = loadLastCenter();
    return last ?? null;
  }, [from]);

  return (
    <div className="container">
      <PickFromMapModal
        open={pickOpen}
        initial={initialForPicker}
        onClose={() => setPickOpen(false)}
        onPick={(pick) => {
          setErr("");
          setFrom(pick);
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
                    onClick={() => setPickOpen(true)}
                    title={trEn("Haritadan seç", "Pick from map")}
                    aria-label={trEn("Haritadan seç", "Pick from map")}
                    style={{
                      minWidth: 46,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ⌖
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