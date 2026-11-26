"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";

const FAQS = [
  {
    q: "이미지는 서버에 저장되나요?",
    a: "아니요. 이미지는 내 브라우저 안에서만 처리되고 어떤 서버로도 전송되거나 저장되지 않아요. 창을 닫으면 편집 내용도 함께 사라져요.",
  },
  {
    q: "어떤 파일을 지원하나요?",
    a: "JPG, PNG, WebP 이미지를 열 수 있어요. 파일은 20MB 이하, 한 변 8,192px·총 1,600만 픽셀 이하여야 해요. 결과는 원본 해상도 그대로 PNG로 저장돼요.",
  },
  {
    q: "모자이크와 가리기의 차이는 무엇인가요?",
    a: "모자이크와 블러는 원래 모습을 흐리게 만드는 방식이라 강도가 약하면 글자를 알아볼 수 있어요. 가리기는 선택 영역을 불투명한 단색으로 완전히 덮어 원본 픽셀이 남지 않아요. 전화번호·주소·이름 같은 글자에는 가리기를 추천해요.",
  },
];

type Props = {
  isLightTheme: boolean;
  onToggleTheme: () => void;
};

export function FaqSection({ isLightTheme, onToggleTheme }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="faq-section" id="faq">
      <div className="section-heading">
        <div>
          <span className="section-kicker">NEED TO KNOW</span>
          <h2>자주 묻는 질문</h2>
        </div>
        <div className="faq-heading-actions">
          <button className="section-theme-button" type="button" onClick={onToggleTheme}>
            {isLightTheme ? <Moon size={14} /> : <Sun size={14} />} {isLightTheme ? "Black 테마" : "White 테마"}
          </button>
          <a href="#faq" className="all-link">
            전체 보기 <span>↗</span>
          </a>
        </div>
      </div>
      <div className="faq-list">
        {FAQS.map((faq, index) => {
          const open = openIndex === index;
          return (
            <div className="faq-entry" key={faq.q}>
              <button
                className="faq-item"
                type="button"
                aria-expanded={open}
                aria-controls={`faq-answer-${index}`}
                onClick={() => setOpenIndex(open ? null : index)}
              >
                <span>{faq.q}</span>
                <span className="faq-plus" aria-hidden="true">
                  +
                </span>
              </button>
              <p className="faq-answer" id={`faq-answer-${index}`} hidden={!open}>
                {faq.a}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
