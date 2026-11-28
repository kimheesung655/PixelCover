"use client";

import { useState } from "react";
import { Editor } from "./editor/Editor";
import { AdRail } from "./site/AdRail";
import { FaqSection } from "./site/FaqSection";
import { HeroSection } from "./site/HeroSection";
import { HowItWorks, TrustBanner } from "./site/HowItWorks";
import { SiteFooter } from "./site/SiteFooter";
import { SiteHeader } from "./site/SiteHeader";

export function PixelCoverApp() {
  const [isLightTheme, setIsLightTheme] = useState(false);
  const toggleTheme = () => setIsLightTheme((current) => !current);

  return (
    <div className={`app-shell ${isLightTheme ? "theme-light" : ""}`}>
      <div className="grain" aria-hidden="true" />
      <AdRail side="left" />
      <AdRail side="right" />

      <div className="page-wrap">
        <SiteHeader isLightTheme={isLightTheme} onToggleTheme={toggleTheme} />
        <main id="top">
          <HeroSection />
          <Editor />
          <HowItWorks />
          <TrustBanner />
          <FaqSection />
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
