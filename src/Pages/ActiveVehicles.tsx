// src/pages/ActiveVehicles.tsx
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { rtdb } from "../firebase";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

type Live = { lat?: number; lng?: number; ts?: number; status?: string };

export default function ActiveVehicles() {
  const [live, setLive] = useState<Record<string, Live>>({});

  useEffect(() => {
    const r = ref(rtdb, "liveLocations");
    return onValue(r, (snap) => setLive(snap.val() || {}));
  }, []);

  const entries = Object.entries(live).filter(([_, v]) => v?.lat && v?.lng && (Date.now() - (v.ts || 0) < 2 * 60 * 1000));
  const center: [number, number] = entries.length ? [entries[0][1].lat!, entries[0][1].lng!] : [38.7312, 35.4787]; // Kayseri fallback

  return (
    <div style={{ padding: 16 }}>
      <MapContainer center={center} zoom={12} style={{ height: 520, borderRadius: 12 }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {entries.map(([id, v]) => (
          <Marker key={id} position={[v.lat!, v.lng!]}>
            <Popup>
              <div style={{ fontWeight: 800 }}>{id}</div>
              <div>{v.status}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
