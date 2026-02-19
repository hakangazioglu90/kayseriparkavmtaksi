import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { onValue, ref } from "firebase/database";
import { rtdb } from "../firebase";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

type Live = { lat?: number; lng?: number; ts?: number; status?: string };

function pillClass(status?: string) {
  if (status === "available") return "pill pillOk";
  if (status === "busy") return "pill pillWarn";
  return "pill pillBad";
}

export default function ActiveVehicles() {
  const [live, setLive] = useState<Record<string, Live>>({});
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const r = ref(rtdb, "liveLocations");
    return onValue(r, (snap) => setLive(snap.val() || {}));
  }, []);

const entries = useMemo(() => {
  const now = Date.now();
  return Object.entries(live)
    .filter(([, v]) => v?.lat && v?.lng && (now - (v.ts || 0) < 2 * 60 * 1000))
    .filter(([id]) => !filter.trim() || id.includes(filter.trim().toUpperCase()))
    .sort((a, b) => (a[0] > b[0] ? 1 : -1));
}, [live, filter]);


  const center: [number, number] = entries.length
    ? [entries[0][1].lat!, entries[0][1].lng!]
    : [38.7312, 35.4787];

  return (
    <div className="container">
      <div className="grid" style={{ gap: 12 }}>
        <div className="card">
          <div className="cardPad row" style={{ justifyContent: "space-between" }}>
            <div className="grid" style={{ gap: 4 }}>
              <div style={{ fontWeight: 950, fontSize: 18 }}>Active vehicles</div>
              <div className="small">Shows vehicles that sent GPS within last 2 minutes.</div>
            </div>

            <div className="row" style={{ gap: 10 }}>
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
                {entries.map(([id, v]) => (
                  <Marker key={id} position={[v.lat!, v.lng!]}>
                    <Popup>
                      <div style={{ fontWeight: 950 }}>{id}</div>
                      <div className="small">{v.status || "offline"}</div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>

          <div className="card">
            <div className="cardPad grid" style={{ gap: 10, maxHeight: 560, overflow: "auto" }}>
              {entries.length === 0 && <div className="p">No vehicles online.</div>}

              {entries.map(([id, v]) => (
                <div key={id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 10 }}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 950 }}>{id}</div>
                    <span className={pillClass(v.status)}>{v.status || "offline"}</span>
                  </div>
                  <div className="small">
                    {v.lat?.toFixed?.(5)}, {v.lng?.toFixed?.(5)}
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
