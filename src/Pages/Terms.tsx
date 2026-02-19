// src/Pages/Terms.tsx  (FIX: keys exist + simple page shell)
import { Link } from "react-router-dom";
import { useI18n } from "../i18n";

export default function Terms() {
  const { t } = useI18n();
  return (
    <div className="container">
      <div className="card">
        <div className="cardPad grid" style={{ gap: 10 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h1 className="h1" style={{ margin: 0 }}>{t("terms.title")}</h1>
            <Link className="btn" to="/">{t("common.back")}</Link>
          </div>

          <pre className="p" style={{ whiteSpace: "pre-wrap", margin: 0 }}>
            {t("terms.body")}
          </pre>
        </div>
      </div>
    </div>
  );
}
