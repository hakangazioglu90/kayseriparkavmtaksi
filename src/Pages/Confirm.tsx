// src/Pages/Confirm.tsx  (Confirm i18n via isolated TR add-on)
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth, ensureAnonAuth } from "../firebase";
import RouteMap from "../components/RouteMap";
import { useI18n } from "../i18n";
import { tConfirm } from "../i18n.confirm";

function Stepper({ done }: { done: boolean }) {
  const { t } = useI18n();
  return (
    <div className="stepper">
      <div className="step stepDone">
        <span className="dot">1</span> {t("step.search")}
      </div>
      <div className="step stepDone">
        <span className="dot">2</span> {t("step.vehicles")}
      </div>
      <div className={`step ${done ? "stepDone" : "stepActive"}`}>
        <span className="dot">3</span> {t("step.confirm")}
      </div>
    </div>
  );
}

const fmtTRY = new Intl.NumberFormat("tr-TR");

export default function Confirm() {
  const { lang } = useI18n();
  const tc = (key: string, en: string) => tConfirm(lang, key, en);
  const trEn = (tr: string, en: string) => (lang === "tr" ? tr : en);

  const nav = useNavigate();
  const loc = useLocation() as any;
  const { from, to, date, vehicle, distanceKm, priceTry, geojson } = (loc.state || {}) as any;

  const [saving, setSaving] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");

  function normalizePhone(input: string): string | null {
    const raw = input.trim();
    if (!raw) return null;

    const hasPlus = raw.startsWith("+");
    const digits = raw.replace(/[^\d]/g, "");
    if (digits.length < 10 || digits.length > 15) return null;

    // TR convenience normalization:
    // 0XXXXXXXXXX -> +90XXXXXXXXXX
    if (!hasPlus && digits.length === 11 && digits.startsWith("0")) return `+90${digits.slice(1)}`;
    // 90XXXXXXXXXX -> +90XXXXXXXXXX
    if (!hasPlus && digits.length === 12 && digits.startsWith("90")) return `+${digits}`;

    return `+${digits}`;
  }

  const normalizedPhone = useMemo(() => normalizePhone(customerPhone), [customerPhone]);
  const phoneOk = !!normalizedPhone;

  const tripTitle = useMemo(() => `${from?.label || "-"} → ${to?.label || "-"}`, [from, to]);

  if (!from || !to || !vehicle) return <div className="container">{tc("confirm.missing", "Missing data.")}</div>;

  async function copyId() {
    if (!doneId) return;
    try {
      await navigator.clipboard.writeText(doneId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  return (
    <div className="container">
      <div className="grid" style={{ gap: 12 }}>
        <div className="card">
          <div className="cardPad grid" style={{ gap: 10 }}>
            <Stepper done={!!doneId} />
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="grid" style={{ gap: 4 }}>
                <div style={{ fontWeight: 950, fontSize: 18 }}>{tripTitle}</div>
                <div className="small">
                  {tc("confirm.date", "Date")}: <b>{date}</b>
                </div>
              </div>

              {!doneId ? (
                <button className="btn" onClick={() => nav("/results", { state: { from, to, date } })}>
                  {tc("confirm.btn.back", "Back")}
                </button>
              ) : (
                <button className="btn" onClick={() => nav("/")}>
                  {tc("confirm.btn.newSearch", "New search")}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="cardPad">
            <RouteMap from={from} to={to} geojson={geojson} />
          </div>
        </div>

        <div className="card">
          <div className="cardPad grid" style={{ gap: 10 }}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 950, fontSize: 18 }}>{vehicle.plate}</div>
                <div className="small">
                  {Number(distanceKm || 0).toFixed(1)} km • {fmtTRY.format(priceTry)} TRY
                </div>
              </div>

              <span className={`pill ${doneId ? "pillOk" : "pillWarn"}`}>
                {doneId ? tc("confirm.badge.sent", "request sent") : tc("confirm.badge.pending", "pending")}
              </span>
            </div>

            <hr className="hr" />

            {doneId ? (
              <div className="grid" style={{ gap: 10 }}>
                <div style={{ fontWeight: 1000, fontSize: 20 }}>{tc("confirm.title.created", "Request created")}</div>

                <div className="p" style={{ margin: 0 }}>
                  {tc("confirm.desc.wait", "Waiting for driver response.")}
                </div>

                <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 10, background: "rgba(0,0,0,.02)" }}>
                  <div className="small" style={{ marginBottom: 6 }}>
                    {tc("confirm.bookingId", "Booking ID")}
                  </div>

                  <div className="row" style={{ justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontWeight: 900 }}>
                      {doneId}
                    </div>

                    <button className="btn" onClick={copyId}>
                      {copied ? tc("confirm.copied", "Copied") : tc("confirm.copy", "Copy")}
                    </button>
                  </div>

                  <div className="small" style={{ marginTop: 6, opacity: 0.75 }}>
                    {tc("confirm.keepId", "Keep this ID for support.")}
                  </div>
                </div>

                <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                  <button className="btn" onClick={() => nav("/active")}>
                    {tc("confirm.btn.viewActive", "View active vehicles")}
                  </button>
                  <button className="btn btnPrimary" onClick={() => nav("/")}>
                    {tc("confirm.btn.done", "Done")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid" style={{ gap: 12 }}>
                <div className="small">{tc("confirm.hint.pending", "Confirm creates a booking request (status: pending).")}</div>

                <div className="grid2" style={{ gap: 10 }}>
                  <div className="grid" style={{ gap: 6 }}>
                    <div className="small" style={{ fontWeight: 900, color: "rgba(0,0,0,.7)" }}>
                      {trEn("Telefon (zorunlu)", "Phone (required)")}
                    </div>
                    <input
                      className="input"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      inputMode="tel"
                      placeholder={trEn("Örn: 05xx xxx xx xx", "Example: +90 5xx xxx xx xx")}
                      aria-invalid={!phoneOk && customerPhone.trim().length > 0}
                    />
                    {!phoneOk && customerPhone.trim().length > 0 && (
                      <div className="small" style={{ color: "var(--bad)", fontWeight: 850 }}>
                        {trEn("Telefon formatı geçersiz.", "Invalid phone format.")}
                      </div>
                    )}
                  </div>

                  <div className="grid" style={{ gap: 6 }}>
                    <div className="small" style={{ fontWeight: 900, color: "rgba(0,0,0,.7)" }}>
                      {trEn("Ad Soyad (opsiyonel)", "Full name (optional)")}
                    </div>
                    <input
                      className="input"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={trEn("", "")}
                    />
                  </div>
                </div>

                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <div className="small" style={{ opacity: 0.85 }}>
                    {trEn("Sürücünün dönüş yapabilmesi için telefon gereklidir.", "Phone is required so the driver can reach you.")}
                  </div>

                  <button
                    className="btn btnPrimary"
                    disabled={saving || !phoneOk}
                    onClick={async () => {
                      setErr("");
                      if (!normalizedPhone) {
                        setErr(trEn("Telefon giriniz.", "Please enter a phone number."));
                        return;
                      }
                      setSaving(true);
                      try {
                        await ensureAnonAuth();
                        const uid = auth.currentUser?.uid;
                        if (!uid) throw new Error(tc("confirm.err.anon", "Anonymous auth failed"));

                        const ref = await addDoc(collection(db, "bookings"), {
                          from,
                          to,
                          date,
                          vehicleId: vehicle.id,
                          plate: vehicle.plate,
                          distanceKm,
                          priceTry,
                          status: "pending",
                          customerUid: uid,
                          customerPhone: normalizedPhone,
                          customerName: customerName.trim() ? customerName.trim() : null,
                          createdAt: serverTimestamp(),
                          updatedAt: serverTimestamp(),
                        });

                        setDoneId(ref.id);
                      } catch (e: any) {
                        setErr(e?.message || tc("confirm.err.failed", "Booking failed"));
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    {saving ? tc("confirm.creating", "Creating…") : tc("confirm.confirm", "Confirm")}
                  </button>
                </div>
              </div>
            )}

            {err && <div style={{ color: "var(--bad)", fontWeight: 850 }}>{err}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}