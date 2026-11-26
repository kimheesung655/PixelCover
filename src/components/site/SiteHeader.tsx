import { LockKeyhole, Menu, Moon, ShieldCheck, Sun } from "lucide-react";

type Props = {
  isLightTheme: boolean;
  onToggleTheme: () => void;
};

export function SiteHeader({ isLightTheme, onToggleTheme }: Props) {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="PixelCover 홈">
        <span className="brand-mark">
          <ShieldCheck size={18} strokeWidth={2.5} />
        </span>
        <span>
          Pixel<span>Cover</span>
        </span>
      </a>
      <nav className="desktop-nav" aria-label="주요 메뉴">
        <a href="#editor">편집 도구</a>
        <a href="#how-to">사용 방법</a>
        <div className="faq-nav-item">
          <a href="#faq">자주 묻는 질문</a>
          <button
            className={`theme-toggle ${isLightTheme ? "is-light" : ""}`}
            type="button"
            aria-label={isLightTheme ? "Black 테마로 전환" : "White 테마로 전환"}
            aria-pressed={isLightTheme}
            onClick={onToggleTheme}
          >
            <span className="theme-toggle-track">
              <span className="theme-toggle-thumb">{isLightTheme ? <Sun size={11} /> : <Moon size={11} />}</span>
            </span>
            <span>{isLightTheme ? "WHITE" : "BLACK"}</span>
          </button>
        </div>
      </nav>
      <div className="header-actions">
        <span className="privacy-chip">
          <LockKeyhole size={13} /> 브라우저에서 안전하게 처리
        </span>
        {/* TODO: 모바일 메뉴 열기 동작 미구현 */}
        <button className="menu-button" type="button" aria-label="메뉴 열기">
          <Menu size={20} />
        </button>
      </div>
    </header>
  );
}
