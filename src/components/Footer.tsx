// src/components/Footer.tsx  (ADD: professional footer + links)
import { Link } from "react-router-dom";
import { useI18n } from "../i18n";

export default function Footer() {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  return (
    <div style={{ padding: "18px 0" }}>
      <div className="container">
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div className="small" style={{ opacity: 0.75 }}>
            {t("footer.copy", { year })}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Link className="btn" to="/terms">{t("footer.terms")}</Link>
            <Link className="btn" to="/privacy">{t("footer.privacy")}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
