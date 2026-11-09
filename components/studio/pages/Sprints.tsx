"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStoredJSON } from "@/lib/studio/store";
import { useStudioData, useT } from "@/lib/studio/StudioProvider";
import type { BankQuestion, Rec } from "@/lib/studio/types";
import { SPRINT_STORE, csvCell, downloadBlob } from "@/components/studio/practice/backup";

type Storage = { sessions: Record<string, Rec>; history: Rec[]; settings: Rec };

const EMPTY: Rec = {};
const DEFAULT_SETTINGS = { module: "2", size: 25, timer: 0, mode: "exam" };
const LETTERS = "ABCDEF";

function normalize(v: Rec | null | undefined): Storage {
  const x = v || {};
  return { sessions: x.sessions || {}, history: Array.isArray(x.history) ? x.history : [], settings: x.settings || { ...DEFAULT_SETTINGS } };
}

const sprintLabels = (k: string) => ({ "1": "Domain 1 · Risk Management", "2": "Domain 2 · Analytics", "3": "Domain 3 · Investigations", all: "All domains (40/30/30 for 100Q)" })[k as "1"] || "Mixed practice";

function sprintTime(deadline: number) {
  const r = Math.max(0, deadline - Date.now());
  return `${Math.floor(r / 60000)}:${String(Math.floor((r % 60000) / 1000)).padStart(2, "0")}`;
}

function sprintSample<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(n, a.length));
}

const sameList = (a: number[], b: number[]) => a?.length === b?.length && a?.every((v, i) => v === b[i]);

/** Ticking "Time remaining" value; submits the drill when the deadline passes. */
function SprintClock({ deadline, onExpire }: { deadline: number; onExpire: () => void }) {
  const [, tick] = useState(0);
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  });
  useEffect(() => {
    const id = setInterval(() => {
      tick((n) => n + 1);
      if (Date.now() >= deadline) expire.current();
    }, 1000);
    return () => clearInterval(id);
  }, [deadline]);
  return <strong id="sprintClock">{sprintTime(deadline)}</strong>;
}

export function SprintsPage() {
  const t = useT();
  const { bank } = useStudioData();
  const [raw, setRaw] = useStoredJSON<Rec>(SPRINT_STORE, EMPTY);
  const storage = useMemo(() => normalize(raw), [raw]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sprintBank = useMemo(() => bank.filter((x) => !x.sprintExcluded), [bank]);
  const byId = useMemo(() => new Map(bank.map((q) => [q.id, q])), [bank]);

  const mutate = useCallback(
    (fn: (s: Storage) => void) => {
      setRaw((prev) => {
        const next = normalize(JSON.parse(JSON.stringify(prev || {})));
        fn(next);
        return next as unknown as Rec;
      });
    },
    [setRaw],
  );

  const s = activeId ? storage.sessions[activeId] : null;
  const lookup = (sess: Rec): BankQuestion[] => (sess.ids as string[]).map((id) => byId.get(id)).filter(Boolean) as BankQuestion[];
  const check = (sess: Rec, idx: number) => {
    const q = lookup(sess)[idx];
    return q ? sameList([...sess.answers[idx]].sort((a: number, b: number) => a - b), [...q.correct].sort((a, b) => a - b)) : false;
  };
  const patch = (fn: (sess: Rec) => void) => {
    if (!activeId) return;
    mutate((st) => {
      const sess = st.sessions[activeId];
      if (sess) fn(sess);
    });
  };

  function start() {
    const p = storage.settings;
    const n = Number(p.size);
    const domain = String(p.module);
    const mix = (a: BankQuestion[], k: number | string) => a.filter((q) => String(q.module) === String(k));
    let groups: BankQuestion[];
    if (domain === "all" && n === 100) groups = [...sprintSample(mix(sprintBank, 1), 40), ...sprintSample(mix(sprintBank, 2), 30), ...sprintSample(mix(sprintBank, 3), 30)];
    else groups = sprintSample(domain === "all" ? sprintBank : mix(sprintBank, domain), n);
    groups = sprintSample(groups, groups.length);
    const now = Date.now();
    const id = "s" + now;
    const sess = {
      id,
      domain,
      mode: p.mode || "exam",
      timeLimit: Number(p.timer || 0),
      startedAt: now,
      deadline: Number(p.timer) > 0 ? now + Number(p.timer) * 60000 : null,
      ids: groups.map((q) => q.id),
      answers: groups.map(() => [] as number[]),
      current: 0,
      submitted: false,
      checked: [] as number[],
      score: null,
      reviewOnly: false,
    };
    mutate((st) => {
      st.sessions[id] = sess;
    });
    setActiveId(id);
  }

  function submit(force = false) {
    if (!s || s.submitted) return;
    const n = s.answers.filter((a: number[]) => a.length).length;
    if (!force && n < s.ids.length && !window.confirm(`You have ${s.ids.length - n} unanswered questions. Submit anyway?`)) return;
    const qs = lookup(s);
    let correct = 0;
    qs.forEach((_, i) => {
      if (check(s, i)) correct++;
    });
    const outcomes = qs.map((q, i) => ({ id: q.id, domain: q.module, chapter: q.chapter, correct: check(s, i), kind: q.kind, answered: (s.answers[i] || []).length > 0 }));
    const sid = s.id as string;
    mutate((st) => {
      const sess = st.sessions[sid];
      if (!sess || sess.submitted) return;
      sess.submitted = true;
      sess.submittedAt = Date.now();
      sess.reviewOnly = false;
      sess.score = correct;
      st.history.unshift({ id: sid, date: new Date().toISOString(), domain: sess.domain, total: sess.ids.length, correct, mode: sess.mode, outcomes });
    });
  }

  function answer(opt: number, on: boolean) {
    if (!s || s.submitted || (s.mode === "practice" && s.checked.includes(s.current))) return;
    const q = lookup(s)[s.current];
    patch((sess) => {
      if (q.kind !== "multi") sess.answers[sess.current] = [opt];
      else {
        const a: number[] = sess.answers[sess.current];
        if (on && !a.includes(opt) && a.length < q.correct.length) a.push(opt);
        else if (!on) sess.answers[sess.current] = a.filter((x) => x !== opt);
      }
    });
  }

  function exportCsv() {
    if (!s?.submitted) return;
    const qs = lookup(s);
    const rows = [
      ["Question ID", "Domain", "Subchapter", "Correct", "Selected", "Answer key", "Question", "Explanation"],
      ...qs.map((q, i) => [q.id, q.module, q.chapter, check(s, i) ? "Yes" : "No", s.answers[i].map((j: number) => LETTERS[j]).join("|"), q.correct.map((j) => LETTERS[j]).join("|"), q.stem, q.explanation]),
    ];
    downloadBlob(new Blob(["﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }), "CAFS_Supplemental_Drill_" + s.id + ".csv", 3000);
  }

  function setting(k: string, value: string) {
    mutate((st) => {
      st.settings[k] = ["size", "timer"].includes(k) ? Number(value) : value;
    });
  }

  // ---- Results ----
  if (s?.submitted && !s.reviewOnly) {
    const qs = lookup(s);
    const wrong = qs.map((q, i) => ({ q, idx: i, ok: check(s, i) }));
    const grouped: Record<string, { total: number; good: number; ids: number[] }> = {};
    wrong.forEach((x) => {
      const z = grouped[x.q.chapter] || { total: 0, good: 0, ids: [] };
      z.total++;
      if (x.ok) z.good++;
      else z.ids.push(x.idx);
      grouped[x.q.chapter] = z;
    });
    const sorted = Object.entries(grouped).sort((a, b) => a[1].good / a[1].total - b[1].good / b[1].total);
    const multi = wrong.filter((x) => x.q.kind === "multi");
    const mini = (list: typeof wrong) => (list.length ? Math.round((list.filter((x) => x.ok).length / list.length) * 100) : 0);
    const overall = Math.round((s.score / s.ids.length) * 100);
    return (
      <>
        <div className="sprint-hero">
          <div className="eyebrow">{t("sprints.resultsEyebrow", "SUPPLEMENTAL PRACTICE · ANSWERS FROM UPLOADED MODULES")}</div>
          <h1>
            {s.score}/{s.ids.length} correct · {overall}%
          </h1>
          <p>{sprintLabels(s.domain)}. This is practice feedback, not an official ACAMS score or a calibrated readiness estimate.</p>
        </div>
        <div className="sprint-grid">
          <div className="sprint-stat">
            <strong>{overall}%</strong>
            <small>Overall</small>
          </div>
          <div className="sprint-stat">
            <strong>{mini(multi)}%</strong>
            <small>Multi-select ({multi.length})</small>
          </div>
          <div className="sprint-stat">
            <strong>{wrong.filter((x) => !x.ok).length}</strong>
            <small>To review</small>
          </div>
        </div>
        <div className="sprint-layout" style={{ marginTop: 17 }}>
          <section className="sprint-box">
            <h2>{t("sprints.prioritiesTitle", "Your revision priorities")}</h2>
            <p className="muted small">{t("sprints.prioritiesNote", "Topics with lower accuracy appear first. Small sample sizes are indicative, not definitive.")}</p>
            {sorted.slice(0, 10).map(([name, g]) => (
              <div className="sprint-topic" key={name}>
                <span>
                  <b>{name}</b>
                  <br />
                  <span className="muted">
                    {g.good}/{g.total} correct · {g.total <= 2 ? "Limited evidence" : "Practice evidence"}
                  </span>
                </span>
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    const j = qs.findIndex((q, i) => q.chapter === name && !check(s, i));
                    patch((sess) => {
                      sess.current = Math.max(0, j);
                      sess.reviewOnly = true;
                    });
                  }}
                >
                  Review {g.ids.length}
                </button>
              </div>
            ))}
            <div className="sprint-warning">{t("sprints.resultsWarning", "If a question conflicts with the official study guide, use the guide as the authority. Imported answers have not all been independently checked.")}</div>
            <div className="sprint-actions">
              <button
                className="btn btn-primary"
                onClick={() => {
                  const j = qs.findIndex((_, i) => !check(s, i));
                  patch((sess) => {
                    sess.current = Math.max(j, 0);
                    sess.reviewOnly = true;
                  });
                }}
              >
                {t("sprints.reviewMissed", "Review missed answers")}
              </button>
              <button className="btn" onClick={exportCsv}>
                {t("sprints.exportCsv", "Export results CSV")}
              </button>
              <button className="btn" onClick={() => setActiveId(null)}>
                {t("sprints.newDrill", "New drill")}
              </button>
            </div>
          </section>
          <aside className="sprint-box">
            <h3>{t("sprints.nowTitle", "What to do now")}</h3>
            <p className="muted small">
              1. Read the missed question and compare the options.
              <br />
              2. Revisit the matching subsection of your CAFS study guide.
              <br />
              3. Try a different question about the same concept.
              <br />
              4. Focus on weak areas before attempting another 100-question mock.
            </p>
            <h3>{t("sprints.reviewQuestions", "Review questions")}</h3>
            <div className="sprint-palette">
              {wrong.map((x, i) => (
                <button
                  key={i}
                  className={`domain-${x.q.module} ${x.ok ? "right" : "wrong"}`}
                  onClick={() =>
                    patch((sess) => {
                      sess.current = i;
                      sess.reviewOnly = !!sess.submitted;
                    })
                  }
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </aside>
        </div>
      </>
    );
  }

  // ---- Start screen ----
  if (!s) {
    const p = storage.settings;
    const hist = storage.history;
    const existing = Object.values(storage.sessions)
      .filter((x) => !x.submitted)
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 3);
    return (
      <>
        <div className="sprint-hero">
          <div className="eyebrow">{t("sprints.eyebrow", "CAFS · RAPID REVISION")}</div>
          <h1>{t("sprints.title", "Timed module drills")}</h1>
          <p>{`Study using your ${bank.length} additional uploaded questions. Choose a module, set a practice length and review weaknesses immediately. Full 100-question mixed drills use the 40/30/30 blueprint.`}</p>
        </div>
        <div className="sprint-layout">
          <section className="sprint-box">
            <h2>{t("sprints.createTitle", "Create a new drill")}</h2>
            <p className="muted small">{t("sprints.createNote", "Use these for learning and consolidation. Content quality varies; these supplemental results remain outside your formal readiness dashboard.")}</p>
            <div className="sprint-grid">
              <div className="sprint-field">
                <label>{t("sprints.source", "Question source")}</label>
                <select id="sprintModule" value={p.module} onChange={(e) => setting("module", e.target.value)}>
                  {["1", "2", "3", "all"].map((v) => (
                    <option key={v} value={v}>
                      {sprintLabels(v)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sprint-field">
                <label>{t("sprints.questions", "Questions")}</label>
                <select id="sprintSize" value={Number(p.size)} onChange={(e) => setting("size", e.target.value)}>
                  {[10, 25, 50, 100].map((v) => (
                    <option key={v} value={v}>
                      {v} questions
                    </option>
                  ))}
                </select>
              </div>
              <div className="sprint-field">
                <label>{t("sprints.timeLimit", "Time limit")}</label>
                <select id="sprintTimer" value={Number(p.timer)} onChange={(e) => setting("timer", e.target.value)}>
                  {(
                    [
                      [0, "Untimed"],
                      [25, "25 minutes"],
                      [60, "60 minutes"],
                      [90, "90 minutes"],
                      [175, "175 minutes"],
                    ] as [number, string][]
                  ).map(([v, n]) => (
                    <option key={v} value={v}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="sprint-field">
              <label>{t("sprints.mode", "Feedback mode")}</label>
              <select id="sprintMode" value={p.mode} onChange={(e) => setting("mode", e.target.value)}>
                <option value="exam">{t("sprints.modeExam", "Exam: results after submission")}</option>
                <option value="practice">{t("sprints.modePractice", "Practice: check each answer immediately")}</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={start}>
              {t("sprints.start", "Start drill →")}
            </button>
            {existing.length ? (
              <>
                <h3 style={{ marginTop: 23 }}>{t("sprints.resume", "Resume unfinished drills")}</h3>
                {existing.map((x) => (
                  <div className="sprint-list-item" key={x.id}>
                    {sprintLabels(x.domain)} · {x.answers.filter((a: number[]) => a.length).length}/{x.ids.length} answered{" "}
                    <button className="btn btn-sm" onClick={() => storage.sessions[x.id] && setActiveId(x.id)}>
                      Resume
                    </button>
                  </div>
                ))}
              </>
            ) : null}
          </section>
          <aside className="sprint-box">
            <h3>{t("sprints.prioritiesAside", "Study-guide priorities")}</h3>
            <p className="small muted">{t("sprints.asideNote", "Alternate focused chapter revision with mixed recall. Use a fresh timed mock to check your understanding before final review.")}</p>
            <div className="sprint-warning">{t("sprints.asideWarning", "Question counts do not measure mastery. Review explanations critically, especially for questions with similar answer options.")}</div>
            <h3>{t("sprints.recent", "Recent supplemental drills")}</h3>
            {hist.length ? (
              hist.slice(0, 5).map((h, i) => (
                <div className="sprint-list-item" key={i}>
                  {sprintLabels(h.domain)}{" "}
                  <b>
                    {h.correct}/{h.total}
                  </b>
                </div>
              ))
            ) : (
              <p className="muted small">{t("sprints.recentEmpty", "No completed drills yet.")}</p>
            )}
          </aside>
        </div>
      </>
    );
  }

  // ---- Question screen ----
  const qs = lookup(s);
  const i = Math.min(s.current, qs.length - 1);
  const q = qs[i];
  const sel: number[] = s.answers[i] || [];
  const reveal = s.submitted || (s.mode === "practice" && s.checked.includes(i));
  const answered = s.answers.filter((a: number[]) => a.length).length;
  return (
    <>
      <div className="sprint-hero">
        <div className="eyebrow">
          {s.submitted ? "ANSWER REVIEW" : "TIMED MODULE PRACTICE"} · {sprintLabels(s.domain)}
        </div>
        <h1>
          Question {i + 1} of {qs.length}
        </h1>
        <p>
          {sel.length} option{sel.length === 1 ? "" : "s"} selected · {answered}/{qs.length} answered · {s.timeLimit ? `${s.timeLimit}-minute limit` : "Untimed"}
        </p>
      </div>
      <div className="sprint-track">
        <i style={{ width: `${(answered / qs.length) * 100}%` }}></i>
      </div>
      <div className="sprint-layout">
        <section className="sprint-box">
          <div className="muted small">
            {q.chapter} · {q.kind === "multi" ? `Select ${q.correct.length}` : "Select ONE"} · {q.id}
          </div>
          <div className="sprint-question">{q.stem}</div>
          {q.options.map((o, j) => (
            <label key={j} className={`sprint-opt ${sel.includes(j) ? "selected" : ""} ${reveal && q.correct.includes(j) ? "correct" : ""} ${reveal && sel.includes(j) && !q.correct.includes(j) ? "wrong" : ""}`}>
              <input type={q.kind === "single" ? "radio" : "checkbox"} name="sprintAns" value={j} checked={sel.includes(j)} disabled={reveal} onChange={(e) => answer(j, e.target.checked)} />
              <span>
                <b>{LETTERS[j]}. </b>
                {o}
              </span>
            </label>
          ))}
          {reveal ? (
            <div className="sprint-feedback">
              <b>{check(s, i) ? "Correct" : "Review needed"}</b>
              <p>
                Correct: {q.correct.map((j) => LETTERS[j]).join(", ")} · Your answer: {sel.length ? sel.map((j) => LETTERS[j]).join(", ") : "Not answered"}
              </p>
              <p>{q.explanation}</p>
              <small className="muted">{q.chapter} · Imported source answer, not independently validated against every study-guide passage.</small>
            </div>
          ) : null}
          <div className="sprint-actions">
            <button
              className="btn"
              disabled={i === 0}
              onClick={() =>
                patch((sess) => {
                  sess.current = Math.max(0, sess.current - 1);
                })
              }
            >
              ← Previous
            </button>
            <button
              className="btn"
              disabled={i === qs.length - 1}
              onClick={() =>
                patch((sess) => {
                  sess.current = Math.min(sess.ids.length - 1, sess.current + 1);
                })
              }
            >
              Next →
            </button>
            {s.mode === "practice" && !s.submitted && !reveal ? (
              <button
                className="btn btn-primary"
                onClick={() =>
                  patch((sess) => {
                    if (!sess.checked.includes(sess.current)) sess.checked.push(sess.current);
                  })
                }
              >
                Check answer
              </button>
            ) : null}
            {s.submitted ? (
              <button
                className="btn"
                onClick={() =>
                  patch((sess) => {
                    sess.reviewOnly = false;
                  })
                }
              >
                Back to results
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => submit()}>
                Finish &amp; score
              </button>
            )}
          </div>
        </section>
        <aside className="sprint-box">
          <h3>{t("sprints.navigator", "Question navigator")}</h3>
          <div className="sprint-palette">
            {qs.map((tq, j) => (
              <button
                key={j}
                className={`domain-${tq.module} ${j === i ? "now" : ""} ${s.answers[j].length ? "done" : ""} ${s.submitted ? (check(s, j) ? "right" : "wrong") : ""}`}
                onClick={() =>
                  patch((sess) => {
                    sess.current = j;
                    sess.reviewOnly = !!sess.submitted;
                  })
                }
              >
                {j + 1}
              </button>
            ))}
          </div>
          <div className="v8-legend muted small">
            <span>
              <i className="v8-dot v8-d1"></i>Risk
            </span>
            <span>
              <i className="v8-dot v8-d2"></i>Analytics
            </span>
            <span>
              <i className="v8-dot v8-d3"></i>Investigation
            </span>
            <span>
              <i className="v8-dot v8-done"></i>Answered
            </span>
            {s.submitted ? (
              <span>
                <i className="v8-dot v8-missed"></i>Missed
              </span>
            ) : null}
          </div>
          <div className="muted small">Colours show domain and completion, not correctness, until answers are submitted.</div>
          {s.deadline && !s.submitted ? (
            <div className="sprint-warning">
              Time remaining: <SprintClock deadline={s.deadline} onExpire={() => submit(true)} />
            </div>
          ) : s.deadline ? (
            <div className="sprint-warning">
              Time remaining: <strong id="sprintClock">{sprintTime(s.deadline)}</strong>
            </div>
          ) : null}
          <div className="sprint-actions">
            <button className="btn btn-sm" onClick={() => setActiveId(null)}>
              Exit to drills
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
