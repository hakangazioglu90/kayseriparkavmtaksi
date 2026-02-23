// src/components/PickToMapModal.tsx
// Same rule applied: default is always DEFAULT_CENTER unless explicit initial or User presses locate.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { reversePlace, searchPlace } from "../api/geocode";
import type { GeoPick } from "../api/geocode";
import { useI18n } from "../i18n";

type LatLng = { lat: number; lng: number };
type PendingView = { lat: number; lng: number; zoom: number };

const DEFAULT_CENTER: LatLng = {
  lat: 38.72728491733775,
  lng: 35.51863680066396,
};

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

async function firstFulfilled<T>(promises: Promise<T>[]): Promise<T> {
  return new Promise((resolve, reject) => {
    let pending = promises.length;
    const errs: any[] = [];
    for (const p of promises) {
      p.then(resolve).catch((e) => {
        errs.push(e);
        pending -= 1;
        if (pending <= 0) reject(errs[0] ?? new Error("All failed"));
      });
    }
  });
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

function MapRefBinder({
  onMap,
  applyPending,
}: {
  onMap: (m: LeafletMap) => void;
  applyPending: (m: LeafletMap) => void;
}) {
  const map = useMap();
  useEffect(() => {
    onMap(map);
    requestAnimationFrame(() => {
      try {
        map.invalidateSize();
      } catch {
        // ignore
      }
      applyPending(map);
    });
  }, [map, onMap, applyPending]);
  return null;
}

export function PickToMapModal(props: {
  open: boolean;
  initial?: LatLng | null;
  onClose: () => void;
  onPick: (pick: GeoPick) => void;
}) {
  const { lang } = useI18n();
  const trEn = (tr: string, en: string) => (lang === "tr" ? tr : en);

  const mapRef = useRef<LeafletMap | null>(null);
  const pendingViewRef = useRef<PendingView | null>(null);

  const [center, setCenter] = useState<LatLng>(() => props.initial ?? DEFAULT_CENTER);

  const [q, setQ] = useState("");
  const [items, setItems] = useState<GeoPick[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const listOpen = useMemo(() => items.length > 0, [items]);

  const safeSetView = useCallback((lat: number, lng: number, zoom: number) => {
    const m = mapRef.current;
    try {
      const container = m?.getContainer?.();
      const usable = !!m && !!container && (container as any).isConnected !== false;
      if (!usable) {
        pendingViewRef.current = { lat, lng, zoom };
        return;
      }
      m!.setView([lat, lng], zoom, { animate: false });
      m!.invalidateSize();
    } catch {
      pendingViewRef.current = { lat, lng, zoom };
    }
  }, []);

  const bindMap = useCallback((m: LeafletMap) => {
    mapRef.current = m;
  }, []);

  const applyPending = useCallback((m: LeafletMap) => {
    const pv = pendingViewRef.current;
    if (!pv) return;
    pendingViewRef.current = null;
    try {
      m.setView([pv.lat, pv.lng], pv.zoom, { animate: false });
      m.invalidateSize();
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (props.open) {
      setErr("");
      setQ("");
      setItems([]);
      setSearching(false);
      setBusy(false);

      const init = props.initial ?? DEFAULT_CENTER;
      setCenter(init);
      pendingViewRef.current = { lat: init.lat, lng: init.lng, zoom: 15 };

      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") props.onClose();
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }

    mapRef.current = null;
    pendingViewRef.current = null;
    setItems([]);
    setSearching(false);
    setBusy(false);
    setErr("");
  }, [props.open]);

  function updateCenter(c: LatLng) {
    setCenter(c);
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
      const timeoutMs = 3000;
      const pos = await firstFulfilled([getPos(timeoutMs, true), getPos(timeoutMs, false)]);
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      safeSetView(lat, lng, 16);
      updateCenter({ lat, lng });
    } catch (e: any) {
      const code = Number(e?.code || 0);
      if (code === 1) setErr(trEn("Konum izni reddedildi.", "Location permission denied."));
      else if (code === 2) setErr(trEn("Konum alınamadı.", "Position unavailable."));
      else if (code === 3) setErr(trEn("Zaman aşımı (3 sn) Tekrar Deneyiniz.", "Timed out (3s) Try Again."));
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
      <div className="card" style={{ width: "min(920px, 100%)", maxHeight: "min(92vh, 980px)", overflow: "hidden" }}>
        <div className="cardPad grid" style={{ gap: 10 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 950, fontSize: 18 }}>{trEn("Varış noktasını seç", "Pick destination")}</div>
            <button className="btn" onClick={props.onClose} disabled={busy} aria-label={trEn("Kapat", "Close")}>
              ✕
            </button>
          </div>

          <div style={{ position: "relative", zIndex: 50 }}>
            <div className="row" style={{ gap: 8, alignItems: "stretch" }}>
              <input
                className="input"
                value={q}
                onChange={(e) => runSearch(e.target.value)}
                placeholder={trEn("Yer ara (örn: Talas)", "Search place (e.g. Talas)")}
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
                      safeSetView(it.lat, it.lng, 16);
                      updateCenter({ lat: it.lat, lng: it.lng });
                      setQ(it.label);
                      setItems([]);
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

          <div style={{ position: "relative", zIndex: 1, borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)" }}>
            <MapContainer center={[center.lat, center.lng]} zoom={15} style={{ width: "100%", height: "min(54vh, 520px)" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapRefBinder onMap={bindMap} applyPending={applyPending} />
              <CenterTracker onCenter={updateCenter} />
            </MapContainer>

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