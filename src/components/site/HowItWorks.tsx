import { ArrowDownToLine, CloudUpload, LockKeyhole, MousePointer2, ShieldCheck } from "lucide-react";

export function HowItWorks() {
  return (
    <section className="how-section" id="how-to">
      <div className="section-heading">
        <div>
          <span className="section-kicker">HOW IT WORKS</span>
          <h2>세 단계면 충분해요.</h2>
        </div>
        <span className="section-count">01 — 03</span>
      </div>
      <div className="steps-grid">
        <article className="step-card step-card-active">
          <span className="step-number">01</span>
          <div className="step-icon">
            <CloudUpload size={20} />
          </div>
          <h3>이미지 추가</h3>
          <p>
            사진을 업로드하거나
            <br />
            화면에서 바로 붙여넣어요.
          </p>
        </article>
        <article className="step-card">
          <span className="step-number">02</span>
          <div className="step-icon">
            <MousePointer2 size={20} />
          </div>
          <h3>영역 선택</h3>
          <p>
            가리고 싶은 부분을
            <br />
            마우스로 칠하거나 드래그해요.
          </p>
        </article>
        <article className="step-card">
          <span className="step-number">03</span>
          <div className="step-icon">
            <ArrowDownToLine size={20} />
          </div>
          <h3>결과 다운로드</h3>
          <p>
            완성된 이미지를
            <br />내 기기에 저장해요.
          </p>
        </article>
      </div>
    </section>
  );
}

export function TrustBanner() {
  return (
    <section className="trust-banner">
      <div className="trust-icon">
        <LockKeyhole size={20} />
      </div>
      <div>
        <strong>당신의 이미지는 당신의 기기에만</strong>
        <p>PixelCover는 이미지를 서버로 보내지 않습니다. 모든 편집은 브라우저에서 안전하게 처리됩니다.</p>
      </div>
      <ShieldCheck className="trust-shield" size={48} strokeWidth={1} />
    </section>
  );
}
