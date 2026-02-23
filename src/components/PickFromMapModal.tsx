// src/components/PickFromMapModal.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { reversePlace, searchPlace } from "../api/geocode";
import type { GeoPick } from "../api/geocode";
import { useI18n } from "../i18n";

type LatLng = { lat: number; lng: number };

function MapRefBinder({ onMap }: { onMap: (m: LeafletMap) => void }) {
  const map = useMap();
  useEffect(() => onMap(map), [map, onMap]);
  return null;
}

function CenterTracker({ onCenter }: { onCenter: (c: LatLng) => void }) {
  useMapEvents({
    moveend: (e) => {
      const c = e.target.getCenter();
      onCenter({ lat: c.lat, lng: c.lng });
    },
    click: (e) => {
      e.target.setView(e.latlng, e.target.getZoom());
      onCenter({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
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

function IconPin({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 22s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 11.5a2 2 0 1 0 0-4a2 2 0 0 0 0 4Z" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

async function getPos(timeoutMs: number, enableHighAccuracy: boolean): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy,
      maximumAge: 0,
      timeout: timeoutMs,
    });
  });
}

export function PickFromMapModal(props: {
  open: boolean;
  initial?: LatLng | null;
  onClose: () => void;
  onPick: (pick: GeoPick) => void;
}) {
  const { lang } = useI18n();
  const trEn = (tr: string, en: string) => (lang === "tr" ? tr : en);

  const mapRef = useRef<LeafletMap | null>(null);
  const bindMap = useCallback((m: LeafletMap) => {
    mapRef.current = m;
  }, []);

  const [center, setCenter] = useState<LatLng>(() => {
    // global default; user can search anywhere
    return props.initial ?? loadLastCenter() ?? { lat: 20, lng: 0 };
  });

  const [q, setQ] = useState("");
  const [items, setItems] = useState<GeoPick[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const listOpen = useMemo(() => items.length > 0, [items]);

  useEffect(() => {
    if (!props.open) return;

    setErr("");

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);

    // Ensure map centers when opening
    setTimeout(() => {
      mapRef.current?.setView?.([center.lat, center.lng], props.initial ? 15 : 3);
    }, 0);

    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open]);

  useEffect(() => {
    if (!props.open) return;
    if (!props.initial) return;
    setCenter(props.initial);
    mapRef.current?.setView?.([props.initial.lat, props.initial.lng], 15);
  }, [props.open, props.initial]);

  function updateCenter(c: LatLng) {
    setCenter(c);
    saveLastCenter(c);
  }

  async function runSearch(next: string) {
    setQ(next);
    setErr("");

    const term = next.trim();
    if (term.length < 3) {
      setItems([]);
      return;
    }

    setSearching(true);
    try {
      const res = await searchPlace(term, { lang });
      setItems(res);
    } catch (e: any) {
      setItems([]);
      setErr(String(e?.message || "") || trEn("Arama başarısız.", "Search failed."));
    } finally {
      setSearching(false);
    }
  }

  async function findMeMax3s() {
    setErr("");

    if (!("geolocation" in navigator)) {
      setErr(trEn("Bu cihaz konum desteklemiyor.", "This device does not support location."));
      return;
    }

    setBusy(true);
    try {
      // Run both concurrently (high + low accuracy) with the same 3s cap.
      // First success wins; avoids “never returns” on desktops.
      const timeoutMs = 3000;
      const pos = await Promise.any([getPos(timeoutMs, true), getPos(timeoutMs, false)]);

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      mapRef.current?.setView?.([lat, lng], 16);
      updateCenter({ lat, lng });
    } catch (e: any) {
      const code = Number(e?.code || 0);
      if (code === 1) setErr(trEn("Konum izni reddedildi.", "Location permission denied."));
      else if (code === 2) setErr(trEn("Konum alınamadı.", "Position unavailable."));
      else if (code === 3) setErr(trEn("Zaman aşımı (3 sn).", "Timed out (3s)."));
      else setErr(trEn("Konum alınamadı.", "Could not get location."));
    } finally {
      setBusy(false);
    }
  }

  async function useThisPin() {
    setErr("");
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
    } catch {
      setErr(trEn("Adres çözümlenemedi.", "Could not resolve address."));
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

          {/* Search row (higher stacking than the map) */}
          <div style={{ position: "relative", zIndex: 50 }}>
            <div className="row" style={{ gap: 8, alignItems: "stretch" }}>
              <input
                className="input"
                value={q}
                onChange={(e) => runSearch(e.target.value)}
                placeholder={trEn("Yer ara (örn: Melikgazi)", "Search place (e.g. Melikgazi)")}
                autoComplete="off"
                inputMode="search"
                style={{ flex: 1 }}
              />

              <button
                className="btn"
                onClick={findMeMax3s}
                disabled={busy}
                title={trEn("Beni bul (3 sn)", "Find me (3s)")}
                aria-label={trEn("Beni bul (3 sn)", "Find me (3s)")}
                style={{ minWidth: 46, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <IconCrosshair />
              </button>
            </div>

            {searching && (
              <div className="small" style={{ marginTop: 6 }} aria-live="polite">
                {trEn("Aranıyor…", "Searching…")}
              </div>
            )}

            {/* Keep list open; never auto-close on blur (fixes “fraction of a second” issue) */}
            {listOpen && (
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
                  zIndex: 99999,
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
                      setItems([]); // closes list deterministically
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

          {/* Map (lower stacking than dropdown) */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              borderRadius: 14,
              overflow: "hidden",
              border: "1px solid var(--border)",
            }}
          >
            <MapContainer
              center={[center.lat, center.lng]}
              zoom={props.initial ? 15 : 3}
              style={{ width: "100%", height: "min(54vh, 520px)" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapRefBinder onMap={bindMap} />
              <CenterTracker onCenter={updateCenter} />
            </MapContainer>

            {/* Center pin (SVG; always renders) */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -100%)",
                pointerEvents: "none",
                zIndex: 1000,
                color: "rgba(0,0,0,.9)",
                filter: "drop-shadow(0 4px 8px rgba(0,0,0,.35))",
              }}
              aria-hidden="true"
            >
              <IconPin size={28} />
            </div>

            {/* Center dot */}
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

          {err && <div style={{ color: "var(--bad)", fontWeight: 800 }}>{err}</div>}

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