// src/pages/Results.tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { getRoute } from "../api/route";
import { estimatePriceTry } from "../pricing";

type Vehicle = {
  id: string;
  plate: string;
  active: boolean;
  pricing: { baseFareTry: number; perKmTry: number; minFareTry?: number };
};

export default function Results() {
  const nav = useNavigate();
  const loc = useLocation() as any;
  const { from, to, date } = (loc.state || {}) as any;

  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [geojson, setGeojson] = useState<any>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        if (!from || !to) return;
        const r = await getRoute(from, to);
        setDistanceKm(r.distanceKm);
        setGeojson(r.geojson);

        const qv = query(collection(db, "vehicles"), where("active", "==", true));
        const snap = await getDocs(qv);
        const list: Vehicle[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setVehicles(list);
      } catch (e: any) {
        setErr(e.message || "Failed");
      }
    })();
  }, [from, to]);

  if (!from || !to || !date) return <div style={{ padding: 16 }}>Missing search data. Go back.</div>;
  if (err) return <div style={{ padding: 16 }}>{err}</div>;
  if (distanceKm == null) return <div style={{ padding: 16 }}>Calculating route…</div>;

  return (
    <div style={{ padding: 16, maxWidth: 980 }}>
      <div style={{ marginBottom: 12 }}>Distance: {distanceKm.toFixed(1)} km</div>

      <div style={{ display: "grid", gap: 10 }}>
        {vehicles.map((v) => {
          const priceTry = estimatePriceTry(distanceKm, v.pricing);
          return (
            <div key={v.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{v.plate}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  base {v.pricing.baseFareTry} + {v.pricing.perKmTry}/km
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ fontWeight: 800 }}>{priceTry} TRY</div>
                <button onClick={() => nav("/confirm", { state: { from, to, date, vehicle: v, distanceKm, priceTry, geojson } })}>
                  Select
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
