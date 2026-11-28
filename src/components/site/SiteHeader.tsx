import { LockKeyhole, Menu, Moon, ShieldCheck, Sun } from "lucide-react";
import type { Language, SiteCopy } from "../copy";

type Props = {
  copy: SiteCopy;
  language: Language;
  onToggleLanguage: () => void;
  isLightTheme: boolean;
  onToggleTheme: () => void;
};

export function SiteHeader({ copy, language, onToggleLanguage, isLightTheme, onToggleTheme }: Props) {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label={copy.home}>
        <span className="brand-mark">
          <ShieldCheck size={18} strokeWidth={2.5} />
        </span>
        <span>
          Pixel<span>Cover</span>
        </span>
      </a>
      <div className="header-navigation">
        <nav className="desktop-nav" aria-label={copy.navigation}>
          <a href="#editor">{copy.tools}</a>
          <a href="#how-to">{copy.howTo}</a>
          <a href="#faq">{copy.faq}</a>
        </nav>
        <button
          className={`theme-toggle ${isLightTheme ? "is-light" : ""}`}
          type="button"
          aria-label={isLightTheme ? copy.switchTheme.dark : copy.switchTheme.light}
          aria-pressed={isLightTheme}
          onClick={onToggleTheme}
        >
          <span className="theme-toggle-track">
            <span className="theme-toggle-thumb">{isLightTheme ? <Sun size={11} /> : <Moon size={11} />}</span>
          </span>
          <span>{isLightTheme ? "WHITE" : "BLACK"}</span>
        </button>
        <button
          className="language-toggle"
          type="button"
          lang={language === "ko" ? "en" : "ko"}
          aria-label={language === "ko" ? "Switch to English" : "한국어로 전환"}
          onClick={onToggleLanguage}
        >
          {language === "ko" ? "English" : "한국어"}
        </button>
      </div>
      <div className="header-actions">
        <span className="privacy-chip">
          <LockKeyhole size={13} /> {copy.privacy}
        </span>
        {/* TODO: 모바일 메뉴 열기 동작 미구현 */}
        <button className="menu-button" type="button" aria-label={copy.menu}>
          <Menu size={20} />
        </button>
      </div>
    </header>
  );
}
