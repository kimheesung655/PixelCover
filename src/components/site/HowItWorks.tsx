import { ArrowDownToLine, CloudUpload, LockKeyhole, MousePointer2, ShieldCheck } from "lucide-react";
import type { SiteCopy } from "../copy";

const STEP_ICONS = [CloudUpload, MousePointer2, ArrowDownToLine];

export function HowItWorks({ copy }: { copy: SiteCopy }) {
  return (
    <section className="how-section" id="how-to">
      <div className="section-heading">
        <div>
          <span className="section-kicker">HOW IT WORKS</span>
          <h2>{copy.howHeading}</h2>
        </div>
        <span className="section-count">01 — 03</span>
      </div>
      <div className="steps-grid">
        {STEP_ICONS.map((Icon, index) => (
          <article className={`step-card ${index === 0 ? "step-card-active" : ""}`} key={index}>
            <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
            <div className="step-icon"><Icon size={20} /></div>
            <h3>{copy.steps[index].title}</h3>
            <p>{copy.steps[index].description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function TrustBanner({ copy }: { copy: SiteCopy }) {
  return (
    <section className="trust-banner">
      <div className="trust-icon">
        <LockKeyhole size={20} />
      </div>
      <div>
        <strong>{copy.trustHeading}</strong>
        <p>{copy.trustDescription}</p>
      </div>
      <ShieldCheck className="trust-shield" size={48} strokeWidth={1} />
    </section>
  );
}
