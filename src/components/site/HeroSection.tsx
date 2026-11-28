import { FileImage, ShieldCheck, Sparkles } from "lucide-react";

import type { SiteCopy } from "../copy";

export function HeroSection({ copy }: { copy: SiteCopy }) {
  return (
    <section className="hero-section">
      <div className="eyebrow">
        <span className="eyebrow-dot" /> QUICK PRIVACY EDITOR
      </div>
      <h1>
        {copy.heroTitle[0]}
        <br />
        <span>{copy.heroTitle[1]}</span>
      </h1>
      <p className="hero-copy">
        {copy.heroDescription[0]}
        <br className="mobile-break" /> {copy.heroDescription[1]}
      </p>
      <div className="hero-stats">
        <span>
          <ShieldCheck size={15} /> {copy.noUpload}
        </span>
        <span>
          <Sparkles size={15} /> {copy.noAccount}
        </span>
        <span>
          <FileImage size={15} /> JPG · PNG · WebP
        </span>
      </div>
    </section>
  );
}
