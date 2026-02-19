// src/App.tsx  (FIX: language selector restored + routes for Terms/Privacy + footer)
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./Pages/Home";
import Results from "./Pages/Results";
import Confirm from "./Pages/Confirm";
import ActiveVehicles from "./Pages/ActiveVehicles";
import Terms from "./Pages/Terms";
import Privacy from "./Pages/Privacy";
import Footer from "./components/Footer";
import { useI18n } from "./i18n";

function LangButtons() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="row" style={{ gap: 8, alignItems: "center" }} aria-label={t("nav.lang")}>
      <button className="btn" onClick={() => setLang("tr")} style={{ fontWeight: lang === "tr" ? 900 : 700 }}>
        {t("lang.tr")}
      </button>
      <button className="btn" onClick={() => setLang("en")} style={{ fontWeight: lang === "en" ? 900 : 700 }}>
        {t("lang.en")}
      </button>
    </div>
  );
}

export default function App() {
  const { t } = useI18n();

  return (
    <BrowserRouter>
      <div className="topbar">
        <div className="brandRow">
          <div className="brand">
            <span style={{ width: 14, height: 14, borderRadius: 4, background: "var(--brand)" }} />
            <span>{t("brand.name")}</span>
          </div>

          <div className="row" style={{ gap: 8 }}>
            <Link className="btn" to="/">{t("nav.search")}</Link>
            <Link className="btn" to="/active">{t("nav.active")}</Link>
            <LangButtons />
          </div>
        </div>
      </div>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/results" element={<Results />} />
        <Route path="/confirm" element={<Confirm />} />
        <Route path="/active" element={<ActiveVehicles />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
      </Routes>

      <Footer />
    </BrowserRouter>
  );
}
