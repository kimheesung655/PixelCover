import { FileImage, ShieldCheck, Sparkles } from "lucide-react";

export function HeroSection() {
  return (
    <section className="hero-section">
      <div className="eyebrow">
        <span className="eyebrow-dot" /> QUICK PRIVACY EDITOR
      </div>
      <h1>
        사진 속 민감한 부분을
        <br />
        <span>깔끔하게 가려보세요.</span>
      </h1>
      <p className="hero-copy">
        설치 없이 바로 시작하는 이미지 개인정보 보호 도구.
        <br className="mobile-break" /> 업로드부터 다운로드까지, 모든 작업은 내 브라우저 안에서 처리됩니다.
      </p>
      <div className="hero-stats">
        <span>
          <ShieldCheck size={15} /> 서버 전송 없음
        </span>
        <span>
          <Sparkles size={15} /> 회원가입 없음
        </span>
        <span>
          <FileImage size={15} /> JPG · PNG · WebP
        </span>
      </div>
    </section>
  );
}
