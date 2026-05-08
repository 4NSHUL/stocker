import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import type { HorizonVerdict } from "../types";

interface VerdictCardProps {
  verdict: HorizonVerdict;
}

function iconForLabel(label: HorizonVerdict["label"]) {
  if (label === "Good candidate") {
    return <CheckCircle2 aria-hidden="true" size={19} />;
  }

  if (label === "Watchlist") {
    return <Clock3 aria-hidden="true" size={19} />;
  }

  return <AlertTriangle aria-hidden="true" size={19} />;
}

export default function VerdictCard({ verdict }: VerdictCardProps) {
  return (
    <article className={`verdict-card verdict-card--${verdict.label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="verdict-card__top">
        <div>
          <p className="eyebrow">{verdict.horizon}</p>
          <h3>{verdict.label}</h3>
        </div>
        <div className="score-badge">
          <span>{verdict.score}</span>
          <small>/100</small>
        </div>
      </div>

      <p className="verdict-summary">
        {iconForLabel(verdict.label)}
        {verdict.summary}
      </p>

      <div className="reason-grid">
        <div>
          <h4>Supports</h4>
          <ul>
            {(verdict.positives.length > 0 ? verdict.positives : ["No strong positive signal yet."]).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Risks</h4>
          <ul>
            {(verdict.risks.length > 0 ? verdict.risks : ["No major rule-based risk triggered."]).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
