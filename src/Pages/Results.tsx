import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { getRoute } from "../api/route";
import { estimatePriceTry } from "../pricing";
import { useI18n } from "../i18n";
import { useResultsT } from "../i18n.results";

type VehicleImage = { url: string; path: string };

type Vehicle = {
  id: string;
  plate: string;
  active: boolean;
  driverStatus: "available" | "busy" | "offline";
  pricing: { baseFareTry: number; perKmTry: number; minFareTry?: number };
  images?: VehicleImage[];
};

function Stepper() {
  const { t } = useI18n();
  return (
    <div className="stepper" aria-label="Steps">
      <div className="step stepDone"><span className="dot">1</span> {t("step.search")}</div>
      <div className="step stepActive"><span className="dot">2</span> {t("step.vehicles")}</div>
      <div className="step"><span className="dot">3</span> {t("step.confirm")}</div>
    </div>
  );
}

const fmtTRY = new Intl.NumberFormat("tr-TR");

export default function Results() {
  const nav = useNavigate();
  const loc = useLocation() as any;
  const { from, to, date } = (loc.state || {}) as any;

  const rt = useResultsT();

  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [geojson, setGeojson] = useState<any>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        if (!from || !to) return;

        const r = await getRoute(from, to);
        setDistanceKm(r.distanceKm);
        setGeojson(r.geojson);

        const qv = query(
          collection(db, "vehicles"),
          where("active", "==", true),
          where("driverStatus", "==", "available")
        );

        const snap = await getDocs(qv);
        const list: Vehicle[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setVehicles(list);
      } catch (e: any) {
        setErr(e.message || "Failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [from, to]);

  const tripTitle = useMemo(() => {
    const a = from?.label || "-";
    const b = to?.label || "-";
    return `${a} → ${b}`;
  }, [from, to]);

  if (!from || !to || !date) return <div className="container">Missing search data. Go back.</div>;
  if (err) return <div className="container">{err}</div>;

  return (
    <div className="container">
      <div className="grid" style={{ gap: 12 }}>
        <div className="card">
          <div className="cardPad grid" style={{ gap: 10 }}>
            <Stepper />

            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="grid" style={{ gap: 4 }}>
                <div style={{ fontWeight: 950, fontSize: 18 }}>{tripTitle}</div>
                <div className="small">
                  {rt("results.date")}: <b>{date}</b>
                </div>
              </div>

              <button className="btn" onClick={() => nav("/")}>
                {rt("results.editSearch")}
              </button>
            </div>

            <div className="kpi">
              <div className="kpiItem">
                {distanceKm == null
                  ? rt("results.kpi.distance", { km: "…" })
                  : rt("results.kpi.distance", { km: distanceKm.toFixed(1) })}
              </div>
              <div className="kpiItem">
                {loading ? rt("results.kpi.available", { n: "…" }) : rt("results.kpi.available", { n: vehicles.length })}
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="card">
            <div className="cardPad">
              <div className="p">{rt("results.loading")}</div>
            </div>
          </div>
        )}

        {!loading && vehicles.length === 0 && (
          <div className="card">
            <div className="cardPad grid" style={{ gap: 10 }}>
              <div style={{ fontWeight: 950, fontSize: 18 }}>{rt("results.none.title")}</div>
              <div className="p">{rt("results.none.desc")}</div>
              <div className="row">
                <button className="btn" onClick={() => nav("/")}>{rt("results.none.change")}</button>
                <button className="btn btnPrimary" onClick={() => window.location.reload()}>{rt("results.none.retry")}</button>
              </div>
            </div>
          </div>
        )}

        {!loading && vehicles.length > 0 && (
          <div className="grid" style={{ gap: 10 }}>
            {vehicles.map((v) => {
              const priceTry = distanceKm == null ? 0 : estimatePriceTry(distanceKm, v.pricing);
              const imgs = v.images || [];
              const main = imgs[0]?.url;
              const thumbs = imgs.slice(1, 5).map((x) => x.url);

              return (
                <div key={v.id} className="card vehicleCard">
                  <div className="media">
                    <img
                      className="mediaMain"
                      src={main || ""}
                      alt={v.plate}
                      loading="lazy"
                      decoding="async"
                      style={{ display: main ? "block" : "none" }}
                    />
                    {!main && (
                      <div
                        className="mediaMain"
                        style={{ display: "grid", placeItems: "center", color: "rgba(0,0,0,.45)", fontWeight: 900 }}
                      >
                        {rt("results.noImage")}
                      </div>
                    )}

                    <div className="thumbs">
                      {thumbs.map((u, i) => (
                        <img key={i} className="thumb" src={u} alt={`${v.plate} ${i + 2}`} loading="lazy" decoding="async" />
                      ))}
                      {thumbs.length === 0 && (
                        <div className="small" style={{ gridColumn: "1 / -1" }}>
                          {rt("results.noExtraImages")}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid" style={{ gap: 6 }}>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <div style={{ fontWeight: 950, fontSize: 18 }}>{v.plate}</div>
                      <span className="pill pillOk">{rt("results.pill.available")}</span>
                    </div>

                    <div className="small">
                      {rt("results.pricing.base")}{" "}
                      <b>{fmtTRY.format(v.pricing.baseFareTry)}</b> +{" "}
                      <b>{fmtTRY.format(v.pricing.perKmTry)}</b>/km{" "}
                      {v.pricing.minFareTry
                        ? <>• {rt("results.pricing.min")} <b>{fmtTRY.format(v.pricing.minFareTry)}</b></>
                        : null}
                    </div>

                    <div className="small">
                      {rt("results.estimatedTotal")}{" "}
                      <b style={{ color: "var(--ink)" }}>{fmtTRY.format(priceTry)} TRY</b>
                    </div>
                  </div>

                  <div className="grid" style={{ justifyItems: "end", gap: 8 }}>
                    <div style={{ fontWeight: 950, fontSize: 18 }}>{fmtTRY.format(priceTry)} TRY</div>
                    <button
                      className="btn btnPrimary"
                      onClick={() =>
                        nav("/confirm", {
                          state: { from, to, date, vehicle: v, distanceKm, priceTry, geojson },
                        })
                      }
                    >
                      {rt("results.select")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
