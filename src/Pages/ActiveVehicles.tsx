// src/Pages/ActiveVehicles.tsx  (FULL)
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { onValue, ref as dbRef } from "firebase/database";
import { rtdb } from "../firebase";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { useI18n } from "../i18n";

type Live = { lat?: number | string; lng?: number | string; ts?: number | string; status?: string; acc?: number | string };

type Entry = {
  id: string;
  lat: number;
  lng: number;
  ts: number;
  status?: string;
  acc?: number;
  ageMs: number;
  online: boolean;
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

export default function ActiveVehicles() {
  const { lang, setLang, t } = useI18n();
  const trEn = (tr: string, en: string) => (lang === "tr" ? tr : en);

  const [live, setLive] = useState<Record<string, Live>>({});
  const [filter, setFilter] = useState("");
  const [sel, setSel] = useState<string>("");
  const [showStale, setShowStale] = useState(true);

  const mapRef = useRef<LeafletMap | null>(null);

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

  const all = useMemo<Entry[]>(() => {
    const now = Date.now();
    const f = filter.trim().toUpperCase();

    return Object.entries(live)
      .map(([id, v]) => {
        const lat = toNum(v?.lat);
        const lng = toNum(v?.lng);
        const ts = toNum(v?.ts);
        const acc = toNum((v as any)?.acc);

        if (lat == null || lng == null || ts == null) return null;

        const ageMs = Math.max(0, now - ts);
        const online = ageMs < WINDOW_MS;

        return {
          id: id.toUpperCase(),
          lat,
          lng,
          ts,
          acc: acc ?? undefined,
          status: v?.status,
          ageMs,
          online,
        } as Entry;
      })
      .filter(Boolean)
      .filter((x) => !f || (x as Entry).id.includes(f))
      .sort((a, b) => (a!.id > b!.id ? 1 : -1)) as Entry[];
  }, [live, filter]);

  const onlineEntries = useMemo(() => all.filter((x) => x.online), [all]);
  const staleEntries = useMemo(() => all.filter((x) => !x.online), [all]);

  const visible = showStale ? all : onlineEntries;

  const center: [number, number] = visible.length ? [visible[0].lat, visible[0].lng] : [38.7312, 35.4787];

  function focusOn(v: Entry) {
    setSel(v.id);
    try {
      mapRef.current?.setView([v.lat, v.lng], 16, { animate: true });
    } catch {
      // ignore
    }
  }

  function fmtAge(ms: number) {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    return `${h}h`;
  }

  return (
    <div className="container">
      <div className="grid" style={{ gap: 12 }}>
        <div className="card">
          <div className="cardPad row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div className="grid" style={{ gap: 4 }}>
              <div style={{ fontWeight: 950, fontSize: 18 }}>{trEn("Aktif araçlar", "Active vehicles")}</div>
              <div className="small">
                {trEn("Online = son 2 dakika konum güncel.", "Online = location updated within last 2 minutes.")}
              </div>
            </div>

            <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div className="row" style={{ gap: 8, alignItems: "center" }} aria-label={t("nav.lang")}>
                <button className="btn" onClick={() => setLang("tr")} style={{ fontWeight: lang === "tr" ? 900 : 700 }}>
                  {t("lang.tr")}
                </button>
                <button className="btn" onClick={() => setLang("en")} style={{ fontWeight: lang === "en" ? 900 : 700 }}>
                  {t("lang.en")}
                </button>
              </div>

              <label className="row" style={{ gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={showStale} onChange={(e) => setShowStale(e.target.checked)} />
                <span className="small">{trEn("Eski konumları da göster", "Show stale too")}</span>
              </label>

              <input
                className="input"
                style={{ width: 220 }}
                placeholder={trEn("PlakaKey filtrele…", "Filter plateKey…")}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />

              <span className="badge">
                {onlineEntries.length} {trEn("online", "online")} • {all.length} {trEn("toplam", "total")}
              </span>
            </div>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "1.6fr .8fr", gap: 12 }}>
          <div className="card">
            <div className="cardPad">
              <MapContainer
                center={center}
                zoom={12}
                style={{ height: 520, borderRadius: 12 }}
                ref={mapRef as any}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {visible.map((v) => {
                  const selected = sel === v.id;
                  return (
                    <CircleMarker
                      key={v.id}
                      center={[v.lat, v.lng]}
                      radius={selected ? 10 : 8}
                      pathOptions={{
                        weight: selected ? 3 : 2,
                        opacity: v.online ? 1 : 0.4,
                        fillOpacity: v.online ? 0.6 : 0.15,
                      }}
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
                          {" "}
                          • <span className="mono">{fmtAge(v.ageMs)}</span>
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
              {visible.length === 0 && <div className="p">{trEn("Kayıt yok.", "No records.")}</div>}

              {(showStale ? visible : onlineEntries).map((v) => {
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
                      opacity: v.online ? 1 : 0.7,
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
                      {" "}
                      • <span className="mono">{fmtAge(v.ageMs)}</span>
                      {!v.online ? <span className="small"> • {trEn("eski", "stale")}</span> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {showStale && staleEntries.length > 0 ? (
          <div className="small" style={{ opacity: 0.8 }}>
            {trEn(
              "Not: 'eski' demek GPS açık değil veya konum güncellenmiyor (ts eski).",
              "Note: 'stale' means GPS is off or not updating (ts is old)."
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}