"use client";

import { useState } from "react";

import type { SiteCopy } from "../copy";

export function FaqSection({ copy }: { copy: SiteCopy }) {
  const { faqs } = copy;
  const [openIndices, setOpenIndices] = useState<number[]>([]);
  const allOpen = openIndices.length === faqs.length;

  function toggleQuestion(index: number) {
    setOpenIndices((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    );
  }

  return (
    <section className="faq-section" id="faq">
      <div className="section-heading">
        <div>
          <span className="section-kicker">NEED TO KNOW</span>
          <h2>{copy.faq}</h2>
        </div>
        <button
          className="faq-toggle-all"
          type="button"
          aria-controls="faq-answers"
          aria-expanded={allOpen}
          onClick={() => setOpenIndices(allOpen ? [] : faqs.map((_, index) => index))}
        >
          {allOpen ? copy.hideAll : copy.showAll} <span aria-hidden="true">{allOpen ? "▴" : "▾"}</span>
        </button>
      </div>
      <div className="faq-list" id="faq-answers">
        {faqs.map((faq, index) => {
          const open = openIndices.includes(index);
          return (
            <div className="faq-entry" key={index}>
              <button
                className="faq-item"
                type="button"
                aria-expanded={open}
                aria-controls={`faq-answer-${index}`}
                onClick={() => toggleQuestion(index)}
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
