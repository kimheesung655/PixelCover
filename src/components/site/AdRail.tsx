// 광고 자리 표시. 실제 광고 코드는 별도 승인 후 붙인다. 1380px보다 좁은 화면에서는 숨겨진다.
export function AdRail({ side, label }: { side: "left" | "right"; label: string }) {
  return (
    <aside className={`ad-rail ad-rail-${side}`} aria-label={label}>
      <span className="ad-label">ADVERTISEMENT</span>
      <div className="ad-lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <span className="ad-size">300 × 600</span>
    </aside>
  );
}
