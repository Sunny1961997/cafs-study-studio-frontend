"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDb } from "@/lib/studio/db";
import { isCorrect, letter } from "@/lib/studio/engine";
import { Icon } from "@/lib/studio/Icon";
import { pageHref } from "@/lib/studio/nav";
import { useBreadcrumb, useT } from "@/lib/studio/StudioProvider";
import { guideAction, pct, topicOf } from "@/components/studio/practice/helpers";
import { setDrill, useDrill, useStartDrill, type Drill } from "@/components/studio/practice/drillState";

/** Focus practice on one study-guide topic (route /studio/drill). */
export function DrillPage() {
  const drill = useDrill();
  const router = useRouter();
  const done = !!drill?.finished;
  useBreadcrumb(done ? "Practice complete" : "Focus practice");
  useEffect(() => {
    if (!drill) router.replace(pageHref("insights"));
  }, [drill, router]);
  if (!drill) return null;
  return done ? <DrillComplete drill={drill} /> : <DrillQuestion drill={drill} />;
}

function DrillQuestion({ drill }: { drill: Drill }) {
  const t = useT();
  const router = useRouter();
  const [, setDb] = useDb();
  const [warning, setWarning] = useState("");
  const q = drill.qs[drill.current];
  const a = drill.answers[drill.current];
  const checked = drill.checked[drill.current];
  const num = drill.current + 1;
  const last = num === drill.qs.length;
  const correct = isCorrect(q, a);

  const update = (patch: Partial<Drill>) => {
    setWarning("");
    setDrill({ ...drill, ...patch });
  };

  function answer(idx: number, on: boolean) {
    if (checked) return;
    let next = [...a];
    if (q.kind === "single") next = [idx];
    else if (on) {
      if (next.length >= q.correct.length) {
        setWarning(`Select exactly ${q.correct.length} options. Remove a selection first.`);
        return;
      }
      next.push(idx);
    } else next = next.filter((x) => x !== idx);
    update({ answers: drill.answers.map((x, i) => (i === drill.current ? next : x)) });
  }

  function check() {
    if (a.length !== q.correct.length) {
      setWarning(`Please select exactly ${q.correct.length} option(s) before checking.`);
      return;
    }
    update({ checked: drill.checked.map((x, i) => (i === drill.current ? true : x)) });
  }

  function advance() {
    if (!checked) return;
    if (!last) {
      update({ current: drill.current + 1 });
      window.scrollTo(0, 0);
      return;
    }
    const score = drill.qs.reduce((n, qq, i) => n + Number(isCorrect(qq, drill.answers[i])), 0);
    setDb((db) => ({ ...db, drills: [...(db.drills ?? []), { topic: drill.topic, domain: drill.domain, at: Date.now(), score, total: drill.qs.length }] }));
    update({ finished: true });
    window.scrollTo(0, 0);
  }

  return (
    <>
      <div className="page-intro">
        <div className="eyebrow muted">{t("drill.eyebrow", "TARGETED REVISION · NOT A SCORED MOCK")}</div>
        <h1>{t("drill.title", "Focus practice")}</h1>
        <p>
          Domain {drill.domain} · {drill.topic} · {drill.qs.length} existing unique question{drill.qs.length === 1 ? "" : "s"} mapped to this study-guide topic.
        </p>
      </div>
      <div className="drill-steps">
        {drill.qs.map((_, i) => (
          <i key={i} className={i <= drill.current ? "past" : ""}></i>
        ))}
      </div>
      <div className="paper drill-card">
        <div className="paper-header">
          <div>
            <div className="q-overline">
              FOCUS QUESTION {num} / {drill.qs.length}
            </div>
            <div className="q-topic">{q.topic}</div>
          </div>
          <span className={`q-badge ${q.kind === "multi" ? "multi" : ""}`}>{q.kind === "multi" ? "MULTI-SELECT" : "SINGLE ANSWER"}</span>
        </div>
        <div className="stem">{q.stem}</div>
        <div className="answer-direction">
          <b>Select {q.correct.length === 1 ? "ONE" : q.correct.length === 2 ? "TWO" : "THREE"}.</b> Try to explain why the other options are weaker.
        </div>
        <div className="options">
          {q.options.map((op, i) => (
            <label key={i} className={`option ${checked ? (q.correct.includes(i) ? "good" : a.includes(i) ? "bad" : "") : a.includes(i) ? "selected" : ""}`}>
              <input type={q.kind === "multi" ? "checkbox" : "radio"} name={`drill_${drill.current}`} checked={a.includes(i)} disabled={checked} onChange={(e) => answer(i, e.target.checked)} />
              <span className="option-letter">{letter(i)}</span>
              <span className="option-text">{op}</span>
              {checked && q.correct.includes(i) ? <span className="option-note">Correct</span> : null}
            </label>
          ))}
        </div>
        <div className="q-message" id="drillWarning">
          {warning}
        </div>
        {checked ? (
          <div className={`drill-check ${correct ? "good" : "wrong"}`}>
            <strong>{correct ? "Correct. You recognized the distinction." : "Needs revision. Here is the deciding distinction."}</strong>
            <p>{q.explanation}</p>
            <p>
              <strong>Improve:</strong> {guideAction(q)}
            </p>
            <div className="tiny-note">Study Guide: {topicOf(q)}</div>
          </div>
        ) : null}
        <div className="paper-foot">
          <button className="btn" onClick={() => router.push(pageHref("insights"))}>
            {t("drill.return", "Return to insights")}
          </button>
          {checked ? (
            <button className="btn btn-primary" onClick={advance}>
              {last ? "Finish focus session" : "Next practice question"} <Icon name="right" />
            </button>
          ) : (
            <button className="btn btn-primary" onClick={check}>
              {t("drill.check", "Check answer")} <Icon name="check" />
            </button>
          )}
        </div>
      </div>
      <div className="callout">
        <Icon name="info" />
        <div>
          <strong>{t("drill.calloutTitle", "Learning session, not new exam evidence.")}</strong>
          <p>{t("drill.calloutBody", "These questions come from your existing study bank. Focus practice helps reinforce concepts and does not increase formal exam scores or first-seen mastery metrics.")}</p>
        </div>
      </div>
    </>
  );
}

function DrillComplete({ drill }: { drill: Drill }) {
  const t = useT();
  const router = useRouter();
  const start = useStartDrill();
  const good = drill.qs.reduce((n, q, i) => n + Number(isCorrect(q, drill.answers[i])), 0);
  const p = pct(good, drill.qs.length);
  return (
    <>
      <div className="page-intro">
        <div className="eyebrow muted">{t("drill.doneEyebrow", "FOCUS PRACTICE FINISHED")}</div>
        <h1>{t("drill.doneTitle", "Revision session complete")}</h1>
        <p>{drill.topic}</p>
      </div>
      <div className="result-panel score-banner">
        <div className="score-ring" style={{ "--progress": `${p}%` } as React.CSSProperties}>
          <div className="score-inner">
            <strong>{p}%</strong>
            <small>Practice</small>
          </div>
        </div>
        <div className="results-detail">
          <h2>
            {good} of {drill.qs.length} answered correctly
          </h2>
          <p>Revisit “{drill.topic}” in the official guide, then try different questions. This reinforcement score is separate from your exam readiness metrics.</p>
          <div className="hero-buttons">
            <button className="btn btn-primary" onClick={() => router.push(pageHref("insights"))}>
              {t("drill.insights", "My preparation insights")}
            </button>
            <button className="btn" onClick={() => start(drill.domain, drill.topic)}>
              {t("drill.repeat", "Repeat focus questions")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
