import { ShieldCheck } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="brand footer-brand">
        <span className="brand-mark">
          <ShieldCheck size={16} />
        </span>
        <span>
          Pixel<span>Cover</span>
        </span>
      </div>
      <p>Simple tools for a more private internet.</p>
      <span className="footer-copyright">© 2026 PixelCover</span>
    </footer>
  );
}
