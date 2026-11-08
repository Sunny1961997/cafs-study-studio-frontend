"use client";

// Small building blocks of the practice and progress screens (same markup as the original).

import type { ReactNode } from "react";
import { Icon } from "@/lib/studio/Icon";
import { TITLES, letter } from "@/lib/studio/engine";
import type { ExamQuestion, Rec } from "@/lib/studio/types";
import { guideAction, topicOf } from "@/components/studio/practice/helpers";

export function StatCard({ title, num, detail, icon }: { title: string; num: ReactNode; detail: string; icon: string }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span>{title}</span>
        <span className="stat-icon">
          <Icon name={icon} />
        </span>
      </div>
      <strong className="stat-value">{num}</strong>
      <div className="stat-caption">{detail}</div>
    </div>
  );
}

export function MiniBar({ v }: { v: number }) {
  return (
    <div className="mastery-bar">
      <i className={v < 70 ? "low" : v < 85 ? "warn" : ""} style={{ width: `${Math.min(100, Math.max(0, v))}%` }}></i>
    </div>
  );
}

export function FocusTopicCard({ g, onDrill, label }: { g: { key: string; domain: number; total: number; wrong: number; example: Rec }; onDrill: (domain: number, topic: string) => void; label: string }) {
  return (
    <div className="focus-item">
      <div className="focus-head">
        <strong>{g.key}</strong>
        <span className="focus-count">
          {g.wrong} miss{g.wrong === 1 ? "" : "es"} / {g.total} seen
        </span>
      </div>
      <div className="topic-path">
        Domain {g.domain} · {TITLES[g.domain]}
      </div>
      <p>{guideAction(g.example)}</p>
      <div className="focus-tools">
        <button className="btn btn-sm" onClick={() => onDrill(g.domain, g.key)}>
          <Icon name="target" /> {label}
        </button>
        <span className="study-tag">Study-guide section</span>
      </div>
    </div>
  );
}

/** "Personal improvement guidance" box shown under a wrongly answered question in the exam review. */
export function ReviewHelp({ q, sel, onDrill }: { q: ExamQuestion; sel: number[]; onDrill: (domain: number, topic: string) => void }) {
  const chosen = sel.length ? sel.map((k) => `${letter(k)}. ${q.options[k]}`).join("; ") : "No option selected";
  const right = q.correct.map((k) => `${letter(k)}. ${q.options[k]}`).join("; ");
  const extra = sel.filter((k) => !q.correct.includes(k));
  const missing = q.correct.filter((k) => !sel.includes(k));
  const diagnostic =
    q.kind === "multi"
      ? `${missing.length} correct option(s) missed${extra.length ? " and " + extra.length + " distractor(s) selected" : ""}. Exact-match multi-select scoring treats the whole response as incorrect.`
      : sel.length
        ? "The selected option was a plausible distractor, but it did not satisfy the deciding condition in the study-guide explanation."
        : "This question was skipped. Review the underlying decision before attempting it again.";
  return (
    <section className="review-help">
      <h4>
        <Icon name="target" /> Personal improvement guidance
      </h4>
      <div className="review-choice">
        <strong>Your answer:</strong> {chosen}
      </div>
      <div className="review-choice">
        <strong>Correct answer:</strong> {right}
      </div>
      <p>{diagnostic}</p>
      <p>
        <strong>What to improve:</strong> {guideAction(q)}
      </p>
      <button className="btn btn-sm" onClick={() => onDrill(q.domain, topicOf(q))}>
        <Icon name="book" /> Practice this study-guide topic
      </button>
    </section>
  );
}
