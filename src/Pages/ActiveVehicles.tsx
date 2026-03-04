// src/Pages/ActiveVehicles.tsx  (FULL) — language switch + list click focuses map + keeps original “online in last 2 min” logic
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { onValue, ref as dbRef } from "firebase/database";
import { rtdb } from "../firebase";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
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
  status?: string;
  acc?: number;
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

export default function ActiveVehicles() {
  const { lang, setLang, t } = useI18n();
  const trEn = (tr: string, en: string) => (lang === "tr" ? tr : en);

  const [live, setLive] = useState<Record<string, Live>>({});
  const [filter, setFilter] = useState("");
  const [sel, setSel] = useState<string>("");

  const mapRef = useRef<LeafletMap | null>(null);

  // keep existing behavior: show vehicles that sent GPS within last 2 minutes
  const WINDOW_MS = 2 * 60 * 1000;

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

  // Parse all records (no time filter yet)
  const all = useMemo<Entry[]>(() => {
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
      .filter((x) => !f || x.id.includes(f))
      .sort((a, b) => (a.id > b.id ? 1 : -1));
  }, [live, filter]);

  // Apply “online window” filter (this is the only thing that can make list empty if GPS isn’t sending frequently)
  const entries = useMemo(() => {
    const now = Date.now();
    return all.filter((x) => now - x.ts < WINDOW_MS);
  }, [all]);

  const center: [number, number] = entries.length
    ? [entries[0].lat, entries[0].lng]
    : [38.7312, 35.4787];

  function focusOn(v: Entry) {
    setSel(v.id);
    try {
      mapRef.current?.setView([v.lat, v.lng], 16, { animate: true });
    } catch {
      // ignore
    }
  }

  return (
    <div className="container">
      <div className="grid" style={{ gap: 12 }}>
        <div className="card">
          <div className="cardPad row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div className="grid" style={{ gap: 4 }}>
              <div style={{ fontWeight: 950, fontSize: 18 }}>{trEn("Aktif araçlar", "Active vehicles")}</div>
              <div className="small">
                {trEn(
                  "Son 2 dakika içinde GPS gönderen araçları gösterir.",
                  "Shows vehicles that sent GPS within last 2 minutes."
                )}
              </div>
            </div>

            <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {/* language selection (simple + uses existing keys only) */}
              <div className="row" style={{ gap: 8, alignItems: "center" }}>
                <button className="btn" onClick={() => setLang("tr")} style={{ fontWeight: lang === "tr" ? 900 : 700 }}>
                  {t("lang.tr")}
                </button>
                <button className="btn" onClick={() => setLang("en")} style={{ fontWeight: lang === "en" ? 900 : 700 }}>
                  {t("lang.en")}
                </button>
              </div>

              <input
                className="input"
                style={{ width: 220 }}
                placeholder={trEn("PlakaKey filtrele…", "Filter plateKey…")}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />

              {/* shows both: online count + total parsed count, so you can see if “2 minutes” is the reason */}
              <span className="badge">
                {entries.length} {trEn("online", "online")} • {all.length} {trEn("toplam", "total")}
              </span>
            </div>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "1.6fr .8fr", gap: 12 }}>
          <div className="card">
            <div className="cardPad">
              <MapContainer center={center} zoom={12} style={{ height: 520, borderRadius: 12 }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapRefBinder onMap={(m) => (mapRef.current = m)} />

                {entries.map((v) => {
                  const selected = sel === v.id;
                  return (
                    <CircleMarker
                      key={v.id}
                      center={[v.lat, v.lng]}
                      radius={selected ? 10 : 8}
                      pathOptions={{ weight: selected ? 3 : 2 }}
                      eventHandlers={{ click: () => focusOn(v) }}
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
                  );
                })}
              </MapContainer>
            </div>
          </div>

          <div className="card">
            <div className="cardPad grid" style={{ gap: 10, maxHeight: 560, overflow: "auto" }}>
              {entries.length === 0 && (
                <div className="p">
                  {trEn("Online araç yok.", "No vehicles online.")}
                  <div className="small" style={{ marginTop: 6 }}>
                    {trEn(
                      "Not: 'online' için son 2 dakika şartı var. 'toplam' > 0 ise GPS güncellemesi eski kalmış olabilir.",
                      "Note: 'online' requires updates in last 2 minutes. If 'total' > 0, GPS updates may be stale."
                    )}
                  </div>
                </div>
              )}

              {entries.map((v) => {
                const selected = sel === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    className="btn"
                    onClick={() => focusOn(v)}
                    style={{
                      textAlign: "left",
                      width: "100%",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: 10,
                      background: selected ? "rgba(0,0,0,.06)" : "#fff",
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