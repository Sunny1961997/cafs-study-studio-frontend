"use client";

// Exam workspace (/studio/exam/[id]): questions, navigator palette, timer, flags, submit dialog
// and the answer-review mode (?review=1 or ?review=incorrect). Markup follows examMarkup/drawQuestion.

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PreflightDialog } from "@/components/studio/exam/PreflightDialog";
import { setLastMode, startFreshSession } from "@/components/studio/exam/examUtils";
import { ReviewHelp } from "@/components/studio/practice/parts";
import { useStartDrill } from "@/components/studio/practice/drillState";
import { useDb, useTimerMinutes } from "@/lib/studio/db";
import { TITLES, doneCount, isComplete, isCorrect, letter, scoreCount, stamp } from "@/lib/studio/engine";
import { Icon } from "@/lib/studio/Icon";
import { pageHref, resultsHref } from "@/lib/studio/nav";
import { useBreadcrumb, useStudioData, useT } from "@/lib/studio/StudioProvider";
import type { Exam, Session } from "@/lib/studio/types";

type Palette = "all" | "unanswered" | "flagged" | "incorrect";

export function ExamPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { exams } = useStudioData();
  const [db, setDb] = useDb();
  const [, setTimer] = useTimerMinutes();
  const exam = exams.find((x) => x.id === id);
  const session = db.sessions[id];
  const reviewParam = useSearchParams().get("review") ?? "";
  const valid = !!session && Array.isArray(session.answers) && session.answers.length === 100;
  const review = valid && session.submitted && !!reviewParam;
  const badBank = !!session && Array.isArray(session.answers) && !valid;
  useBreadcrumb(review ? "Answer review" : "Exam workspace");

  useEffect(() => {
    if (!exam) router.replace(pageHref("overview"));
    else if (badBank) startFreshSession(exams, setDb, id, 0, "simulation");
    else if (valid && session.submitted && !review) router.replace(resultsHref(id));
  }, [exam, badBank, valid, session, review, router, exams, setDb, id]);

  if (!exam) return null;
  if (!session || badBank) {
    return (
      <PreflightDialog
        exam={exam}
        onCancel={() => (window.history.length > 1 ? router.back() : router.push(pageHref("mocks")))}
        onLaunch={(minutes, mode) => {
          setTimer(minutes);
          setLastMode(mode);
          startFreshSession(exams, setDb, id, minutes, mode);
        }}
      />
    );
  }
  if (session.submitted && !review) return null;
  return <Workspace exam={exam} session={session} review={review} initialPalette={reviewParam === "incorrect" ? "incorrect" : "all"} />;
}

function Workspace({ exam, session, review, initialPalette }: { exam: Exam; session: Session; review: boolean; initialPalette: Palette }) {
  const t = useT();
  const router = useRouter();
  const [, setDb] = useDb();
  const startDrill = useStartDrill();
  const id = exam.id;
  const qs = exam.questions;
  const total = qs.length;
  const [palette, setPalette] = useState<Palette>(initialPalette);
  const [message, setMessage] = useState("");
  const [focus, setFocus] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [clock, setClock] = useState({ text: "—", late: false });
  const finishing = useRef(false);

  const current = Math.max(0, Math.min(total - 1, session.current || 0));
  const q = qs[current];
  const sel = session.answers[current] || [];
  const mode = session.simulationMode || "simulation";
  const n = doneCount(exam, session);
  const flagged = session.flags.filter(Boolean).length;
  const multiKind = q.kind === "multi";
  const req = q.correct.length;

  const update = useCallback(
    (fn: (s: Session) => void) => {
      setDb((prev) => {
        const s = prev.sessions[id];
        if (!s) return prev;
        const copy: Session = { ...s, answers: [...s.answers], flags: [...s.flags] };
        fn(copy);
        return { ...prev, sessions: { ...prev.sessions, [id]: copy } };
      });
    },
    [id, setDb],
  );

  const jump = useCallback(
    (i: number) => {
      if (i < 0 || i > total - 1) return;
      setMessage("");
      update((s) => {
        s.current = i;
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [total, update],
  );

  const answer = useCallback(
    (idx: number, checked: boolean) => {
      if (review) return;
      const question = qs[current];
      let a = [...(session.answers[current] || [])];
      if (question.kind !== "multi") a = [idx];
      else if (checked) {
        if (a.length >= question.correct.length) {
          setMessage(`Select only ${question.correct.length} answers. Uncheck one before adding another.`);
          return;
        }
        if (!a.includes(idx)) a.push(idx);
      } else a = a.filter((k) => k !== idx);
      setMessage("");
      update((s) => {
        s.answers[current] = a.sort((x, y) => x - y);
      });
    },
    [review, qs, current, session.answers, update],
  );

  const toggleFlag = useCallback(() => {
    if (review) return;
    setMessage("");
    update((s) => {
      s.flags[current] = !s.flags[current];
    });
  }, [review, current, update]);

  const finish = useCallback(
    (timeout: boolean) => {
      if (finishing.current) return;
      finishing.current = true;
      setDb((prev) => {
        const s = prev.sessions[id];
        if (!s || s.submitted) return prev;
        const submittedAt = Date.now();
        const score = scoreCount(exam, s);
        const next: Session = { ...s, submitted: true, submittedAt, autoSubmitted: !!timeout, score };
        const history = [...(prev.history[id] || []), { score, at: submittedAt, answers: s.answers.map((a) => (Array.isArray(a) ? [...a] : [])) }];
        return { ...prev, sessions: { ...prev.sessions, [id]: next }, history: { ...prev.history, [id]: history } };
      });
      router.replace(resultsHref(id));
      window.scrollTo(0, 0);
    },
    [exam, id, router, setDb],
  );

  // Countdown (only while the attempt is open).
  const endAt = session.endAt;
  useEffect(() => {
    if (review || session.submitted) return;
    const tick = () => {
      if (!endAt) {
        setClock({ text: "Untimed", late: false });
        return;
      }
      const rem = Math.max(0, endAt - Date.now());
      setClock({ text: stamp(rem), late: rem < 300000 });
      if (rem <= 0) finish(true);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [review, session.submitted, endAt, finish]);

  // Keyboard shortcuts.

  const onKeys = (event: KeyboardEvent) => {
    const tag = document.activeElement?.tagName;
    if (submitOpen || (tag && ["INPUT", "TEXTAREA", "SELECT"].includes(tag)) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      jump(current + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      jump(current - 1);
    } else if (event.key.toLowerCase() === "f" && !review) {
      event.preventDefault();
      toggleFlag();
    } else if (/^[1-6]$/.test(event.key) && !review) {
      const i = Number(event.key) - 1;
      if (i < q.options.length) {
        event.preventDefault();
        answer(i, !sel.includes(i));
      }
    }
  };
  useEffect(() => {
    document.addEventListener("keydown", onKeys);
    return () => document.removeEventListener("keydown", onKeys);
  });

  // Escape closes the submit dialog.
  useEffect(() => {
    if (!submitOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSubmitOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [submitOpen]);

  const visible = qs.map((_, i) => i).filter((i) => palette === "all" || (palette === "flagged" && session.flags[i]) || (palette === "unanswered" && !isComplete(qs[i], session.answers[i])) || (palette === "incorrect" && review && !isCorrect(qs[i], session.answers[i])));
  const visibleSet = new Set(visible);
  const chips: [Palette, string][] = (
    [
      ["all", t("exam.palette.all", "All")],
      ["unanswered", t("exam.palette.unanswered", "Unanswered")],
      ["flagged", t("exam.palette.flagged", "Flagged")],
      ["incorrect", t("exam.palette.incorrect", "Incorrect")],
    ] as [Palette, string][]
  ).filter(([k]) => k !== "incorrect" || review);

  const missing = qs.findIndex((qq, i) => !isComplete(qq, session.answers[i]));
  const flagIndex = session.flags.findIndex(Boolean);
  const right = isCorrect(q, sel);
  const unfinished = total - n;

  const submitModal = submitOpen
    ? createPortal(
        <div className="v16-dialog-backdrop" id="v16-submit-overlay">
          <section className="v16-dialog" role="dialog" aria-modal="true" aria-labelledby="v16ConfirmTitle">
            <span className="v16-eyebrow">{t("exam.submit.eyebrow", "FINAL SUBMISSION REVIEW")}</span>
            <h2 id="v16ConfirmTitle">{t("exam.submit.title", "Ready to submit your fraud assessment?")}</h2>
            <p>{exam.title}</p>
            <div className="v16-check-grid">
              <div>
                <b>{n}</b>
                <small>{t("exam.submit.complete", "Complete")}</small>
              </div>
              <div>
                <b>{unfinished}</b>
                <small>{t("exam.submit.incomplete", "Incomplete")}</small>
              </div>
              <div>
                <b>{flagged}</b>
                <small>{t("exam.submit.flagged", "Flagged")}</small>
              </div>
            </div>
            {n < total ? (
              <p className="v16-submit-warning">
                {unfinished} {t("exam.submit.warning", "question(s) remain unanswered or partially selected. They will receive no credit unless you return and complete them.")}
              </p>
            ) : null}
            <p>{t("exam.submit.text", "Submitting finalizes this attempt, scores every item (multi-select requires an exact match) and reveals the answer explanations. Your result is a practice score, not an ACAMS certification decision.")}</p>
            <div className="v16-modalactions">
              <button className="btn" onClick={() => setSubmitOpen(false)}>
                {t("exam.submit.continue", "Continue exam")}
              </button>
              {missing >= 0 ? (
                <button
                  className="btn"
                  onClick={() => {
                    setSubmitOpen(false);
                    jump(missing);
                  }}
                >
                  {t("exam.submit.missing", "Go to incomplete question")}
                </button>
              ) : null}
              {flagIndex >= 0 ? (
                <button
                  className="btn"
                  onClick={() => {
                    setSubmitOpen(false);
                    jump(flagIndex);
                  }}
                >
                  {t("exam.submit.review", "Review flagged")}
                </button>
              ) : null}
              <button
                className="btn btn-primary"
                autoFocus
                onClick={() => {
                  setSubmitOpen(false);
                  finish(false);
                }}
              >
                {t("exam.submit.confirm", "Submit & view results →")}
              </button>
            </div>
          </section>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <section className={`v16-examwork ${mode === "simulation" ? "v16-simulation" : ""} ${focus ? "focus" : ""}`} data-v16-exam={id}>
        <div className="v16-exam-top">
          <div>
            <div className="v16-exam-kicker">
              {exam.type === "chapter" ? t("exam.kicker.chapter", "DOMAIN KNOWLEDGE ASSESSMENT") : t("exam.kicker.mock", "FRAUD SIMULATION")} {review ? ` · ${t("exam.kicker.review", "ANSWER REVIEW")}` : ""}
            </div>
            <h1>{exam.title}</h1>
            <p>
              {review
                ? t("exam.sub.review", "Answer key and study-guide explanations are visible after submission.")
                : mode === "simulation"
                  ? t("exam.sub.simulation", "Simulation mode · rationale and topic identifiers hidden until submission.")
                  : t("exam.sub.guided", "Guided practice mode · topics visible, answers hidden until submission.")}
            </p>
          </div>
          <div className="v16-exam-actions">
            <span className="v16-counter">
              <small>{t("exam.counter.answered", "Answered")}</small>
              <strong id="completeDisplay">{n}</strong>
              <small>/ {total}</small>
            </span>
            <span className="v16-counter">
              <small>{t("exam.counter.flagged", "Flagged")}</small>
              <strong id="v16FlagDisplay">{flagged}</strong>
            </span>
            <span className="v16-counter timer">
              <small>{t("exam.counter.time", "Time")}</small>
              <strong id="clockDisplay" style={!review && clock.late ? { color: "var(--error)" } : undefined}>
                {review ? "Submitted" : clock.text}
              </strong>
            </span>
            <button className="btn btn-sm" aria-label="Toggle focus mode" onClick={() => setFocus(!focus)}>
              {focus ? t("exam.focus.show", "◫ Show navigator") : t("exam.focus.on", "◫ Focus")}
            </button>
            <button className="btn btn-sm" onClick={() => router.push(pageHref("overview"))}>
              {t("exam.saveExit", "Save & exit")}
            </button>
          </div>
        </div>
        <div className="v16-progress-line">
          <div id="examProgress" style={{ width: `${(n * 100) / total}%` }} />
        </div>
        <div className="v16-exam-grid">
          <section className="paper v16-questionpaper" id="questionPaper" aria-label="Current question">
            <div className={`paper-header domain-head-${q.domain}`}>
              <div>
                <div className="q-overline">
                  QUESTION <b>{String(current + 1).padStart(2, "0")}</b> / {total}
                </div>
                <div className="q-topic">{mode === "simulation" && !review ? t("exam.topicWithheld", "Topic withheld during simulation") : `Domain ${q.domain} · ${q.topic}`}</div>
              </div>
              <span className={`q-badge ${multiKind ? "multi" : ""}`}>{q.kind === "truefalse" ? "TRUE / FALSE" : multiKind ? "MULTI-SELECT" : "SINGLE BEST ANSWER"}</span>
            </div>
            <div className="stem">{q.stem}</div>
            <div className="answer-direction">
              <b>{multiKind ? `Select ${req}` : q.kind === "truefalse" ? "Choose TRUE or FALSE" : "Select ONE"}.</b>{" "}
              {multiKind ? `Choose exactly ${req} answers.` : q.kind === "truefalse" ? "Judge whether the statement is correct." : "Choose the single most appropriate answer."}
            </div>
            <div className="options">
              {q.options.map((v, k) => {
                const selected = sel.includes(k);
                const isRight = q.correct.includes(k);
                const cls = review ? (isRight ? "good" : selected ? "bad" : "") : selected ? "selected" : "";
                return (
                  <label key={`${current}-${k}`} className={`option ${cls} ${selected ? "selected" : ""}`}>
                    <input
                      type={multiKind ? "checkbox" : "radio"}
                      name={`answer_${current}`}
                      value={k}
                      checked={selected}
                      disabled={review}
                      onChange={(e) => {
                        answer(k, e.target.checked);
                        e.target.blur();
                      }}
                    />
                    <span className="option-letter">{letter(k)}</span>
                    <span className="option-text">{v}</span>
                    {review ? isRight ? <span className="option-note">Correct</span> : selected ? <span className="option-note">Your selection</span> : null : null}
                  </label>
                );
              })}
            </div>
            <div className="q-message" id="questionMessage">
              {message}
            </div>
            {review ? (
              <>
                <section className="explain">
                  <div className={`explain-head ${right ? "" : "incorrect"}`}>
                    {right ? "Correct answer" : sel.length ? "Incorrect answer" : "Question skipped"} · Correct: {q.correct.map(letter).join(", ")}
                  </div>
                  <p>{q.explanation}</p>
                  <small>
                    Guide topic: {q.sourceSection || q.topic} · {TITLES[q.domain]} · Original practice material, not validated by ACAMS.
                  </small>
                </section>
                {!right ? <ReviewHelp q={q} sel={sel} onDrill={startDrill} /> : null}
              </>
            ) : null}
            <div className="paper-foot">
              <div className="paper-foot-left">
                <button className="btn" disabled={current === 0} onClick={() => jump(current - 1)}>
                  <Icon name="left" /> {t("exam.previous", "Previous")}
                </button>
                <button className="btn btn-primary" disabled={current === total - 1} onClick={() => jump(current + 1)}>
                  {t("exam.next", "Next")} <Icon name="right" />
                </button>
              </div>
              {review ? (
                <button className="btn btn-sm" onClick={() => router.push(resultsHref(id))}>
                  <Icon name="chart" /> {t("exam.results", "Results")}
                </button>
              ) : (
                <button className="btn btn-sm" onClick={toggleFlag}>
                  <Icon name="flag" /> {session.flags[current] ? t("exam.unflag", "Unflag question") : t("exam.flag", "Flag for review")}
                </button>
              )}
            </div>
            {review ? (
              <div className="source-ref">
                Reference: {q.sourceSection || q.topic} · CAFS Study Guide v1.03 (practice adaptation){" "}
                <button className="btn btn-sm" onClick={() => router.push(`${pageHref("chapterSummaries")}?domain=${q.domain}`)}>
                  {t("exam.reviseDomain", "Revise this domain →")}
                </button>
              </div>
            ) : null}
          </section>
          <aside className="palette-card v16-palette">
            <div className="palette-head">
              <strong>{t("exam.navigator", "Question navigator")}</strong>
              <span className="small muted" id="paletteCount">
                {visibleSet.size} showing
              </span>
            </div>
            <p className="palette-sub">{t("exam.navigatorSub", "Choose a number or filter your unanswered questions.")}</p>
            <div className="palette-filter">
              {chips.map(([k, name]) => (
                <button key={k} className={`filter-chip ${palette === k ? "active" : ""}`} onClick={() => setPalette(k)}>
                  {name}
                </button>
              ))}
            </div>
            <div className="qmap" id="paletteMap">
              {visible.length ? (
                visible.map((i) => {
                  const qq = qs[i];
                  const done = isComplete(qq, session.answers[i]);
                  const ok = isCorrect(qq, session.answers[i]);
                  const c = review ? (ok ? "correct" : "incorrect") : done ? "answered" : "";
                  return (
                    <button
                      key={i}
                      className={`qdot domain-${qq.domain} ${c} ${session.flags[i] ? "flagged" : ""} ${current === i ? "current" : ""}`}
                      aria-label={`Question ${i + 1}, ${review ? (ok ? "correct" : "incorrect or skipped") : done ? "answered" : "incomplete"}`}
                      title={`Question ${i + 1} · ${qq.topic}`}
                      onClick={() => jump(i)}
                    >
                      {i + 1}
                    </button>
                  );
                })
              ) : (
                <p className="small muted" style={{ gridColumn: "1/-1" }}>
                  {t("exam.noFilter", "No questions in this filter.")}
                </p>
              )}
            </div>
            <div className="palette-legend">
              <span>
                <i className="key-dot a"></i>
                {review ? t("exam.legend.correct", "Correct") : t("exam.legend.answered", "Answered")}
              </span>
              <span>
                <i className="key-dot f"></i>
                {t("exam.legend.flagged", "Flagged")}
              </span>
              <span>
                <i className="key-dot c"></i>
                {t("exam.legend.current", "Current")}
              </span>
            </div>
            <div className="palette-summary">
              <div className="small muted" id="flagCount">
                {flagged} flagged for review
              </div>
              {review ? (
                <button className="btn btn-primary" onClick={() => router.push(resultsHref(id))}>
                  {t("exam.backReport", "← Back to report")}
                </button>
              ) : (
                <>
                  <button className="btn btn-primary" onClick={() => setSubmitOpen(true)}>
                    {t("exam.submit", "Review & submit exam →")}
                  </button>
                  <button className="btn" onClick={() => router.push(pageHref("overview"))}>
                    {t("exam.saveExit2", "Save and exit")}
                  </button>
                </>
              )}
            </div>
          </aside>
        </div>
        <p className="v16-exam-footer">
          {t("exam.footer", "Keyboard: ← / → move questions · 1–6 select answers · F flag. Exam results and explanations unlock only after submission. Practice is independent of ACAMS.")}
        </p>
      </section>
      {submitModal}
    </>
  );
}
