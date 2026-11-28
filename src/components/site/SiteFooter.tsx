import { ShieldCheck } from "lucide-react";

import type { SiteCopy } from "../copy";

export function SiteFooter({ copy }: { copy: SiteCopy }) {
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
      <p>{copy.footer}</p>
      <span className="footer-copyright">© 2026 PixelCover</span>
    </footer>
  );
}
