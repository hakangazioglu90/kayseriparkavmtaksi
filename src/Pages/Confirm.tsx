// src/pages/Confirm.tsx
import { useLocation } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import RouteMap from "../components/RouteMap";

export default function Confirm() {
  const loc = useLocation() as any;
  const { from, to, date, vehicle, distanceKm, priceTry, geojson } = (loc.state || {}) as any;

  if (!from || !to || !vehicle) return <div style={{ padding: 16 }}>Missing data.</div>;

  return (
    <div style={{ padding: 16, maxWidth: 980, display: "grid", gap: 12 }}>
      <RouteMap from={from} to={to} geojson={geojson} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 800 }}>{vehicle.plate}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{distanceKm.toFixed(1)} km • {priceTry} TRY</div>
        </div>
        <button
          onClick={async () => {
            await addDoc(collection(db, "bookings"), {
              from, to, date,
              vehicleId: vehicle.id,
              plate: vehicle.plate,
              distanceKm,
              priceTry,
              status: "pending",
              createdAt: serverTimestamp(),
            });
            alert("Booked (pending).");
          }}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
