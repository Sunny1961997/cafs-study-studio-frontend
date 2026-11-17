"use client";

import { useState } from "react";
import { cafs } from "@/lib/cafs";

const demo = cafs.practiceDemo;

export function PracticeQuestion() {
  const [choice, setChoice] = useState<string | null>(null);
  const [result, setResult] = useState<"empty" | "correct" | "incorrect" | null>(null);

  function check(e: React.FormEvent) {
    e.preventDefault();
    if (!choice) return setResult("empty");
    setResult(choice === demo.correctOptionId ? "correct" : "incorrect");
  }

  return (
    <form className={"cafs-card"} onSubmit={check} id="free-question">
      <p className={"cafs-label"}>{demo.label}</p>
      <h2>{demo.title}</h2>
      <p className={"cafs-lede"}>{demo.scenario}</p>
      <fieldset className={"cafs-fieldset"}>
        <legend>{demo.question}</legend>
        {demo.options.map((o) => (
          <label key={o.id} className={"cafs-option"}>
            <input
              type="radio"
              name="supplier-verification"
              value={o.id}
              checked={choice === o.id}
              onChange={() => {
                setChoice(o.id);
                setResult(null);
              }}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </fieldset>
      <button type="submit" className={`${"cafs-btn"} ${"cafs-primary"}`}>{demo.checkLabel}</button>
      <div className={"cafs-feedback"} role="status" aria-live="polite">
        {result === "empty" && <div className={"cafs-feedbackBox"}>{demo.feedback.empty}</div>}
        {result === "correct" && (
          <div className={`${"cafs-feedbackBox"} ${"cafs-ok"}`}>
            <strong>{demo.feedback.correct}</strong>
            <p>{demo.feedback.explanation}</p>
          </div>
        )}
        {result === "incorrect" && (
          <div className={"cafs-feedbackBox"}>
            <strong>{demo.feedback.incorrect}</strong>
            <p>{demo.feedback.explanation}</p>
          </div>
        )}
      </div>
    </form>
  );
}
