import { useRef, useState } from "react";
import { LockKeyhole, Menu, Moon, ShieldCheck, Sun, X } from "lucide-react";
import type { Language, SiteCopy } from "../copy";

type Props = {
  copy: SiteCopy;
  language: Language;
  onToggleLanguage: () => void;
  isLightTheme: boolean;
  onToggleTheme: () => void;
};

export function SiteHeader({ copy, language, onToggleLanguage, isLightTheme, onToggleTheme }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const links = [
    { href: "#editor", label: copy.tools },
    { href: "#how-to", label: copy.howTo },
    { href: "#faq", label: copy.faq },
  ];

  return (
    <header
      className="site-header"
      onKeyDown={(event) => {
        if (event.key === "Escape" && menuOpen) {
          setMenuOpen(false);
          menuButton.current?.focus();
        }
      }}
    >
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
          {links.map(({ href, label }) => <a key={href} href={href}>{label}</a>)}
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
        <button
          ref={menuButton}
          className="menu-button"
          type="button"
          aria-label={menuOpen ? copy.closeMenu : copy.menu}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      <nav className="mobile-nav" id="mobile-navigation" aria-label={copy.navigation} hidden={!menuOpen}>
        {links.map(({ href, label }) => (
          <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>
        ))}
      </nav>
    </header>
  );
}
