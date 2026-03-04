// src/Pages/ActiveVehicles.tsx  (FULL) — RTDB read + language switch + click-to-focus map
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { onValue, ref as dbRef } from "firebase/database";
import { rtdb } from "../firebase";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import { useI18n } from "../i18n";

type Live = {
  lat?: number | string;
  lng?: number | string;
  ts?: number | string;
  status?: string;
  acc?: number | string;
};

type Entry = {
  id: string;
  lat: number;
  lng: number;
  ts: number;
  acc?: number;
  status?: string;
};

function pillClass(status?: string) {
  if (status === "available") return "pill pillOk";
  if (status === "busy") return "pill pillWarn";
  return "pill pillBad";
}

function toNum(x: unknown): number | null {
  const n = typeof x === "string" ? Number(x) : typeof x === "number" ? x : NaN;
  return Number.isFinite(n) ? n : null;
}

function MapRefBinder({ onMap }: { onMap: (m: LeafletMap) => void }) {
  const map = useMap();
  useEffect(() => onMap(map), [map, onMap]);
  return null;
}

function FlagTR() {
  return (
    <img
      src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f1f9-1f1f7.svg"
      alt="TR"
      width={18}
      height={18}
      style={{ display: "block" }}
    />
  );
}

function FlagEN() {
  return (
    <img
      src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f1ec-1f1e7.svg"
      alt="EN"
      width={18}
      height={18}
      style={{ display: "block" }}
    />
  );
}

export default function ActiveVehicles() {
  const { lang, setLang, t } = useI18n();
  const trEn = useCallback(
    (tr: string, en: string) => (lang === "tr" ? tr : en),
    [lang]
  );

  const [live, setLive] = useState<Record<string, Live>>({});
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");

  const mapRef = useRef<LeafletMap | null>(null);
  const pendingFocus = useRef<{ lat: number; lng: number; zoom: number } | null>(null);

  const bindMap = useCallback((m: LeafletMap) => {
    mapRef.current = m;
    // Apply pending focus if user clicked list before map was ready
    if (pendingFocus.current) {
      const p = pendingFocus.current;
      pendingFocus.current = null;
      try {
        m.setView([p.lat, p.lng], p.zoom, { animate: true });
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    const r = dbRef(rtdb, "liveLocations");
    const unsub = onValue(
      r,
      (snap) => setLive((snap.val() as any) || {}),
      (e) => {
        console.error("RTDB read failed:", e);
        setLive({});
      }
    );
    return () => unsub();
  }, []);

  const entries = useMemo<Entry[]>(() => {
    const now = Date.now();
    const f = filter.trim().toUpperCase();

    return Object.entries(live)
      .map(([id, v]) => {
        const lat = toNum(v?.lat);
        const lng = toNum(v?.lng);
        const ts = toNum(v?.ts);
        const acc = toNum((v as any)?.acc);
        return {
          id: id.toUpperCase(),
          lat: lat ?? NaN,
          lng: lng ?? NaN,
          ts: ts ?? NaN,
          acc: acc ?? undefined,
          status: v?.status,
        };
      })
      .filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng) && Number.isFinite(x.ts))
      .filter((x) => now - x.ts < 2 * 60 * 1000)
      .filter((x) => !f || x.id.includes(f))
      .sort((a, b) => (a.id > b.id ? 1 : -1));
  }, [live, filter]);

  const center: [number, number] = entries.length
    ? [entries[0].lat, entries[0].lng]
    : [38.7312, 35.4787];

  const focusOn = useCallback((v: Entry, zoom = 16) => {
    setSelectedId(v.id);
    const m = mapRef.current;
    if (!m) {
      pendingFocus.current = { lat: v.lat, lng: v.lng, zoom };
      return;
    }
    try {
      m.setView([v.lat, v.lng], zoom, { animate: true });
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="container">
      <div className="grid" style={{ gap: 12 }}>
        <div className="card">
          <div
            className="cardPad row"
            style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}
          >
            <div className="grid" style={{ gap: 4 }}>
              <div style={{ fontWeight: 950, fontSize: 18 }}>
                {trEn("Aktif araçlar", "Active vehicles")}
              </div>
              <div className="small">
                {trEn(
                  "Son 2 dakika içinde GPS gönderen araçları gösterir.",
                  "Shows vehicles that sent GPS within last 2 minutes."
                )}
              </div>
            </div>

            <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {/* Language selection (flags included in selection) */}
              <div className="row" style={{ gap: 8, alignItems: "center" }}>
                <button
                  className="btn"
                  onClick={() => setLang("tr")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontWeight: lang === "tr" ? 950 : 750,
                    outline: lang === "tr" ? "2px solid var(--brand)" : "none",
                    outlineOffset: 2,
                  }}
                  aria-label="TR"
                  title="TR"
                >
                  <span>{t("lang.tr")}</span>
                  <FlagTR />
                </button>

                <button
                  className="btn"
                  onClick={() => setLang("en")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontWeight: lang === "en" ? 950 : 750,
                    outline: lang === "en" ? "2px solid var(--brand)" : "none",
                    outlineOffset: 2,
                  }}
                  aria-label="EN"
                  title="EN"
                >
                  <FlagEN />
                  <span>{t("lang.en")}</span>
                </button>
              </div>

              <input
                className="input"
                style={{ width: 220 }}
                placeholder={trEn("PlakaKey filtrele…", "Filter plateKey…")}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />

              <span className="badge">
                {entries.length} {trEn("online", "online")}
              </span>
            </div>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "1.6fr .8fr", gap: 12 }}>
          <div className="card">
            <div className="cardPad">
              <MapContainer center={center} zoom={12} style={{ height: 520, borderRadius: 12 }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapRefBinder onMap={bindMap} />

                {entries.map((v) => (
                  <CircleMarker
                    key={v.id}
                    center={[v.lat, v.lng]}
                    radius={8}
                    pathOptions={{ weight: 2 }}
                    eventHandlers={{
                      click: () => focusOn(v, 16),
                    }}
                  >
                    <Popup>
                      <div style={{ fontWeight: 950 }}>{v.id}</div>
                      <div className="small">{v.status || "offline"}</div>
                      <div className="small">
                        {v.lat.toFixed(5)}, {v.lng.toFixed(5)}
                        {v.acc != null ? (
                          <>
                            {" "}
                            • <span className="mono">{Math.round(v.acc)}m</span>
                          </>
                        ) : null}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          </div>

          <div className="card">
            <div className="cardPad grid" style={{ gap: 10, maxHeight: 560, overflow: "auto" }}>
              {entries.length === 0 && <div className="p">{trEn("Online araç yok.", "No vehicles online.")}</div>}

              {entries.map((v) => {
                const isSel = selectedId === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    className="btn"
                    onClick={() => focusOn(v, 16)}
                    style={{
                      textAlign: "left",
                      width: "100%",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: 10,
                      background: isSel ? "rgba(0,0,0,.06)" : "#fff",
                      outline: isSel ? "2px solid var(--brand)" : "none",
                      outlineOffset: 2,
                    }}
                    title={trEn("Haritada göster", "Focus on map")}
                  >
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <div style={{ fontWeight: 950 }}>{v.id}</div>
                      <span className={pillClass(v.status)}>{v.status || "offline"}</span>
                    </div>

                    <div className="small">
                      {v.lat.toFixed(5)}, {v.lng.toFixed(5)}
                      {v.acc != null ? (
                        <>
                          {" "}
                          • <span className="mono">{Math.round(v.acc)}m</span>
                        </>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}