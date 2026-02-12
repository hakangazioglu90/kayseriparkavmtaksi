// src/pages/Driver.tsx  (Driver PWA: sends GPS -> Realtime DB)
import { useRef, useState } from "react";
import { ref, set } from "firebase/database";
import { rtdb, ensureAnonAuth } from "../firebase";

export default function Driver() {
  const [vehicleId, setVehicleId] = useState("");
  const [token, setToken] = useState(""); // optional “shared secret”
  const [status, setStatus] = useState<"available" | "busy">("available");
  const watchId = useRef<number | null>(null);

  async function start() {
    await ensureAnonAuth();
    if (!vehicleId) return;

    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const payload = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          ts: Date.now(),
          status,
          token: token || null,
        };
        await set(ref(rtdb, `liveLocations/${vehicleId}`), payload);
      },
      (e) => alert(e.message),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  }

  async function stop() {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    if (vehicleId) await set(ref(rtdb, `liveLocations/${vehicleId}`), { ts: Date.now(), status: "offline", token: token || null });
  }

  return (
    <div style={{ padding: 16, maxWidth: 520, display: "grid", gap: 10 }}>
      <div style={{ fontWeight: 800 }}>Driver tracker</div>
      <input placeholder="vehicleId (or plate-id)" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} />
      <input placeholder="token (optional)" value={token} onChange={(e) => setToken(e.target.value)} />
      <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
        <option value="available">available</option>
        <option value="busy">busy</option>
      </select>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={start}>Start</button>
        <button onClick={stop}>Stop</button>
      </div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>MVP: best reliability while app is open (foreground).</div>
    </div>
  );
}
