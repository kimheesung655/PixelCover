"use client";

import { useEffect, useState } from "react";
import { siteCopy, type Language } from "./copy";
import { Editor } from "./editor/Editor";
import { AdRail } from "./site/AdRail";
import { FaqSection } from "./site/FaqSection";
import { HeroSection } from "./site/HeroSection";
import { HowItWorks, TrustBanner } from "./site/HowItWorks";
import { SiteFooter } from "./site/SiteFooter";
import { SiteHeader } from "./site/SiteHeader";

const LANGUAGE_KEY = "pixelcover-language";

export function PixelCoverApp() {
  const [isLightTheme, setIsLightTheme] = useState(false);
  const [language, setLanguage] = useState<Language>("ko");
  const copy = siteCopy[language];

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LANGUAGE_KEY);
      if (saved === "ko" || saved === "en") setLanguage(saved);
    } catch {
      // The language still works when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = copy.title;
  }, [language, copy.title]);

  function toggleLanguage() {
    const next = language === "ko" ? "en" : "ko";
    setLanguage(next);
    try {
      window.localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      // Keep the selection for this page even when storage is unavailable.
    }
  }

  return (
    <div className={`app-shell ${isLightTheme ? "theme-light" : ""}`}>
      <div className="grain" aria-hidden="true" />
      <AdRail side="left" label={copy.ad.left} />
      <AdRail side="right" label={copy.ad.right} />

      <div className="page-wrap">
        <SiteHeader
          copy={copy}
          language={language}
          onToggleLanguage={toggleLanguage}
          isLightTheme={isLightTheme}
          onToggleTheme={() => setIsLightTheme((current) => !current)}
        />
        <main id="top">
          <HeroSection copy={copy} />
          <Editor language={language} />
          <HowItWorks copy={copy} />
          <TrustBanner copy={copy} />
          <FaqSection copy={copy} />
        </main>
        <SiteFooter copy={copy} />
      </div>
    </div>
  );
}
