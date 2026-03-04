// src/Pages/ActiveVehicles.tsx  (FULL) — robust RTDB parsing + marker that always renders (no Leaflet icon assets)
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { onValue, ref as dbRef } from "firebase/database";
import { rtdb } from "../firebase";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";

type Live = {
  lat?: number | string;
  lng?: number | string;
  ts?: number | string;
  status?: string;
  acc?: number | string;
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
  const [live, setLive] = useState<Record<string, Live>>({});
  const [filter, setFilter] = useState("");

  // WEBSITE (ActiveVehicles.tsx) — REPLACE ONLY the useEffect to surface RTDB permission/config errors
useEffect(() => {
  const r = dbRef(rtdb, "liveLocations");
  const unsub = onValue(
    r,
    (snap) => setLive((snap.val() as any) || {}),
    (e) => {
      // If rules deny read or DB URL is wrong, you will see it here
      console.error("RTDB read failed:", e);
      setLive({});
    }
  );
  return () => unsub();
}, []);

  const entries = useMemo(() => {
    const now = Date.now();
    const f = filter.trim().toUpperCase();

    return Object.entries(live)
      .map(([id, v]) => {
        const lat = toNum(v?.lat);
        const lng = toNum(v?.lng);
        const ts = toNum(v?.ts);
        const acc = toNum((v as any)?.acc);
        return { id: id.toUpperCase(), lat, lng, ts, acc, status: v?.status };
      })
      .filter((x) => x.lat != null && x.lng != null && x.ts != null)
      .filter((x) => now - (x.ts as number) < 2 * 60 * 1000)
      .filter((x) => !f || x.id.includes(f))
      .sort((a, b) => (a.id > b.id ? 1 : -1));
  }, [live, filter]);

  const center: [number, number] = entries.length
    ? [entries[0].lat as number, entries[0].lng as number]
    : [38.7312, 35.4787];

  return (
    <div className="container">
      <div className="grid" style={{ gap: 12 }}>
        <div className="card">
          <div className="cardPad row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div className="grid" style={{ gap: 4 }}>
              <div style={{ fontWeight: 950, fontSize: 18 }}>Active vehicles</div>
              <div className="small">Shows vehicles that sent GPS within last 2 minutes.</div>
            </div>

            <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input
                className="input"
                style={{ width: 220 }}
                placeholder="Filter plateKey…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <span className="badge">{entries.length} online</span>
            </div>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "1.6fr .8fr", gap: 12 }}>
          <div className="card">
            <div className="cardPad">
              <MapContainer center={center} zoom={12} style={{ height: 520, borderRadius: 12 }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {entries.map((v) => (
                  <CircleMarker
                    key={v.id}
                    center={[v.lat as number, v.lng as number]}
                    radius={8}
                    pathOptions={{
                      // don’t hardcode colors; rely on defaults? react-leaflet requires a pathOptions object
                      // keep minimal: just stroke weight for visibility
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div style={{ fontWeight: 950 }}>{v.id}</div>
                      <div className="small">{v.status || "offline"}</div>
                      <div className="small">
                        {Number(v.lat).toFixed(5)}, {Number(v.lng).toFixed(5)}
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
              {entries.length === 0 && <div className="p">No vehicles online.</div>}

              {entries.map((v) => (
                <div key={v.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 10 }}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 950 }}>{v.id}</div>
                    <span className={pillClass(v.status)}>{v.status || "offline"}</span>
                  </div>
                  <div className="small">
                    {Number(v.lat).toFixed(5)}, {Number(v.lng).toFixed(5)}
                    {v.acc != null ? (
                      <>
                        {" "}
                        • <span className="mono">{Math.round(v.acc)}m</span>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}