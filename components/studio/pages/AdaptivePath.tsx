"use client";

// Fraud Adaptive Revision Path (adaptive-v15): prioritised weak topics with a linked
// summary -> red flags -> case -> scored recheck route, and the targeted recheck quiz.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import {
  ADAPTIVE_KEY, EMPTY_ADAPTIVE, MODULES, chooseQuiz, evidenceSamples, gather, links, normaliseState,
  planPath, rankedTopics, same, seenKey, unique, type AdaptiveState, type Topic,
} from "@/components/studio/adaptive/logic";
import { useDb } from "@/lib/studio/db";
import { useStudioData, useT, useBreadcrumb } from "@/lib/studio/StudioProvider";
import { useStoredJSON } from "@/lib/studio/store";
import type { ExamQuestion } from "@/lib/studio/types";

type Run = { key: string; label: string; domain: number; qs: ExamQuestion[]; answers: number[][]; pos: number; done: boolean; at: number };

const BACKUP_APP = "CAFS Study Studio v15 Adaptive Learning";
const letter = (i: number) => String.fromCharCode(65 + i);

export function AdaptivePathPage() {
  const t = useT();
  const data = useStudioData();
  const router = useRouter();
  const [db] = useDb();
  const [stored, setStored] = useStoredJSON<AdaptiveState>(ADAPTIVE_KEY, EMPTY_ADAPTIVE);
  const state = useMemo(() => normaliseState(stored), [stored]);
  const [selectedDomain, setSelectedDomain] = useState(0);
  const [run, setRun] = useState<Run | null>(null);
  const [warn, setWarn] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useBreadcrumb(run ? "Targeted Reassessment" : "Adaptive Learning Pathway");

  const exams = data.exams;
  const resources = useMemo(
    () => ({ exams, summaries: data.summaries, cases: data.cases, redFlags: data.redFlags }),
    [exams, data.summaries, data.cases, data.redFlags],
  );
  const topics = useMemo(() => gather(exams, db, state), [exams, db, state]);

  const update = (fn: (s: AdaptiveState) => AdaptiveState) => setStored((prev) => fn(normaliseState(prev)));

  function startQuiz(key: string) {
    const topic = topics.find((x) => x.key === key);
    if (!topic) return;
    const chosen = chooseQuiz(topic, resources, db, state);
    if (!chosen.length) return;
    setWarn("");
    setRun({ key, label: topic.label, domain: topic.domain, qs: chosen, answers: chosen.map(() => []), pos: 0, done: false, at: Date.now() });
    window.scrollTo(0, 0);
  }

  function submitQuiz(r: Run) {
    const total = r.qs.length;
    const correct = r.qs.filter((q, i) => same(q, r.answers[i])).length;
    const percent = Math.round((100 * correct) / total);
    update((s) => ({
      ...s,
      quizzes: [
        ...s.quizzes,
        {
          topicKey: r.key, label: r.label, domain: r.domain, correct, total, percent, at: Date.now(),
          items: r.qs.map((q, i) => ({ id: q.id, stemKey: seenKey(q), correct: same(q, r.answers[i]) })),
        },
      ].slice(-150),
    }));
    setRun({ ...r, done: true });
  }

  function exportBackup() {
    const blob = new Blob(
      [JSON.stringify({ app: BACKUP_APP, exportedAt: new Date().toISOString(), data: state }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "CAFS_v15_Adaptive_Revision_Backup.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function importBackup(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const o = JSON.parse(String(reader.result));
        const v = o?.data;
        if (o.app !== BACKUP_APP || !v || !Array.isArray(v.quizzes) || !v.steps || typeof v.steps !== "object")
          throw Error("Unrecognized adaptive backup");
        if (!confirm("Replace this browser’s adaptive-revision history with the selected backup? Formal exam data will not be changed.")) return;
        setStored({ steps: v.steps, quizzes: v.quizzes.slice(-150) });
      } catch (e) {
        alert("Unable to restore adaptive backup: " + (e as Error).message);
      }
    };
    reader.readAsText(file);
  }

  /* ------------------------------ quiz view ------------------------------ */
  if (run) {
    const home = () => setRun(null);
    if (run.done) {
      const items = run.qs.map((q, i) => ({ q, answers: run.answers[i], ok: same(q, run.answers[i]) }));
      const correct = items.filter((x) => x.ok).length;
      const percent = Math.round((100 * correct) / run.qs.length);
      return (
        <div className="ad15-wrap">
          <div className="ad15-hero">
            <div className="eyebrow">{t("adaptive.done.eyebrow", "Focused recheck completed")}</div>
            <h1>
              {correct} / {run.qs.length} correct · {percent}%
            </h1>
            <p>
              {run.label} · Module {run.domain}.{" "}
              {percent >= 80
                ? "Target reached. Repeat later with different questions to strengthen retention."
                : "Below the 80% study target. Review the missed explanations, then repeat the learning path."}
            </p>
          </div>
          <div className="ad15-actions">
            <button type="button" className="btn btn-primary" onClick={home}>
              {t("adaptive.done.back", "Back to updated learning plan")}
            </button>
            <button type="button" className="btn" onClick={() => startQuiz(run.key)}>
              {t("adaptive.done.again", "Another recheck")}
            </button>
          </div>
          {items.map((x, i) => (
            <div className="ad15-panel ad15-result" key={i}>
              <b>
                Question {i + 1} · {x.ok ? "Correct" : "Needs review"}
              </b>
              <p>{x.q.stem}</p>
              <div className="ad15-muted">
                Your answer: {x.answers.map(letter).join(", ") || "None"} | Correct: {x.q.correct.map(letter).join(", ")}
              </div>
              <p>
                <strong>Why:</strong> {x.q.explanation}
              </p>
              <small>{x.q.sourceSection || x.q.topic || "Study guide reference"}</small>
            </div>
          ))}
        </div>
      );
    }
    const q = run.qs[run.pos];
    const choices = run.answers[run.pos];
    const multiple = q.kind === "multi";
    const count = q.correct.length;
    const choose = (j: number, checked: boolean) =>
      setRun((r) => {
        if (!r) return r;
        const answers = r.answers.slice();
        const a = answers[r.pos];
        answers[r.pos] = multiple ? (checked ? unique([...a, j]) : a.filter((v) => v !== j)) : [j];
        return { ...r, answers };
      });
    const next = () => {
      if (choices.length !== count) {
        setWarn(`Select exactly ${count} ${count === 1 ? "answer" : "answers"} to continue.`);
        return;
      }
      setWarn("");
      if (run.pos === run.qs.length - 1) submitQuiz(run);
      else setRun({ ...run, pos: run.pos + 1 });
    };
    return (
      <div className="ad15-wrap">
        <div className="ad15-header">
          <div>
            <div className="eyebrow">Adaptive Reassessment · Module {run.domain}</div>
            <h1>{run.label}</h1>
            <p className="ad15-muted">
              Question {run.pos + 1} / {run.qs.length} · {multiple ? `Select ${count} answers` : "Choose one answer"} · Exact-match scoring · Answers hidden until you submit
            </p>
          </div>
          <button type="button" className="btn btn-sm" onClick={home}>
            {t("adaptive.quiz.exit", "Exit to learning plan")}
          </button>
        </div>
        <div className="ad15-track ad15-progress">
          <i style={{ width: `${Math.round((run.pos / run.qs.length) * 100)}%` }} />
        </div>
        <article className="ad15-quizpaper">
          <div className="ad15-label">
            {multiple ? "Multi-select" : q.kind === "truefalse" ? "True / False" : "Single best answer"} · {(q as { origin?: string }).origin || "CAFS question bank"}
          </div>
          <h2>{q.stem}</h2>
          <div className="ad15-choices">
            {q.options.map((opt, j) => (
              <label className={`ad15-choice ${choices.includes(j) ? "chosen" : ""}`} key={`${run.pos}-${j}`}>
                <input
                  type={multiple ? "checkbox" : "radio"}
                  name="ad15-answer"
                  checked={choices.includes(j)}
                  onChange={(e) => choose(j, e.target.checked)}
                />
                <b>{letter(j)}</b>
                <span>{opt}</span>
              </label>
            ))}
          </div>
          <p className="ad15-warning" id="ad15-quizwarn">
            {warn}
          </p>
          <div className="ad15-actions">
            <button
              type="button"
              className="btn"
              disabled={run.pos === 0}
              onClick={() => {
                setWarn("");
                setRun({ ...run, pos: run.pos - 1 });
              }}
            >
              {t("adaptive.quiz.prev", "Previous")}
            </button>
            <button type="button" className="btn btn-primary" onClick={next}>
              {run.pos === run.qs.length - 1 ? t("adaptive.quiz.submit", "Submit recheck") : t("adaptive.quiz.next", "Next question")}
            </button>
          </div>
        </article>
      </div>
    );
  }

  /* ------------------------------ plan view ------------------------------ */
  const first = evidenceSamples(exams, db);
  const ranked = rankedTopics(topics).filter((x) => selectedDomain === 0 || x.domain === selectedDomain);
  const reviewSignals = rankedTopics(topics).length;
  const completed = exams.filter((e) => db.sessions[e.id]?.submitted).length;
  const mastery = [1, 2, 3].map((d) => {
    const rows = first.first.filter((x) => x.q.domain === d);
    const ok = rows.filter((x) => x.ok).length;
    return { d, n: rows.length, ok, pct: rows.length ? Math.round((ok * 100) / rows.length) : null };
  });
  const done = state.quizzes.filter((x) => x.percent >= 80).length;

  const setStep = (key: string, step: "summary" | "flags" | "cases", checked: boolean) =>
    update((s) => {
      const cur = s.steps[key] || { summary: false, flags: false, cases: false };
      return { ...s, steps: { ...s.steps, [key]: { ...cur, [step]: checked } } };
    });

  const card = (tp: Topic, i: number) => {
    const path = planPath(tp, resources);
    const ss = state.steps[tp.key] || { summary: false, flags: false, cases: false };
    const rate = tp.accuracy === null ? "No formal sample" : `${tp.accuracy}% first-seen accuracy`;
    const last = tp.quiz ? `${tp.quiz.correct}/${tp.quiz.total} (${tp.quiz.percent}%)` : "Not attempted";
    const pillCls = tp.status === "Rechecked ≥80%" ? "pass" : tp.status === "Recheck needed" ? "low" : tp.isProvisional ? "provisional" : "low";
    const sum = path.sum;
    return (
      <article className="ad15-topic" key={tp.key}>
        <div className="ad15-toprow">
          <div>
            <span className="ad15-rank">
              PRIORITY {i + 1} · MODULE {tp.domain}
            </span>
            <h3>{tp.label}</h3>
          </div>
          <span className={`ad15-pill ${pillCls}`}>{tp.status}</span>
        </div>
        <div className="ad15-micro">
          <span>
            <b>{rate}</b> · {tp.samples} distinct initial items
          </span>
          <span>
            <b>{tp.wrong}</b> initial misses
          </span>
          <span>
            Reassessment: <b>{last}</b>
          </span>
        </div>
        <p className="ad15-muted">
          {tp.isProvisional ? "Limited evidence: fewer than 3 distinct first-seen answers. " : "Initial results identify this as a revision candidate. "}
          {tp.quiz && tp.quiz.percent >= 80
            ? "Recent reassessment met the 80% practice target; retain it for spaced review."
            : "Complete the linked steps, then reassess your understanding."}
        </p>
        <div className="ad15-route">
          <div className="ad15-stage">
            <div>
              <b>01 · Learn the concept</b>
              <small>{sum ? "Matched study-guide summary topic" : "No exact summary match confirmed"}</small>
            </div>
            {sum ? (
              <button type="button" className="btn btn-sm" onClick={() => router.push(links.summary(sum.item.id))}>
                Open {sum.item.id} · {sum.item.title}
              </button>
            ) : (
              <>
                <span className="ad15-muted">No confident one-to-one summary match. Use the chapter summary index.</span>
                <button type="button" className="btn btn-sm" onClick={() => router.push(links.summaryModule(tp.domain))}>
                  Browse Module {tp.domain}
                </button>
              </>
            )}
            <label>
              <input type="checkbox" checked={!!ss.summary} onChange={(e) => setStep(tp.key, "summary", e.target.checked)} /> I reviewed this
            </label>
          </div>
          <div className="ad15-stage">
            <div>
              <b>02 · Review the red flags</b>
              <small>{path.flags.length ? `${path.flags.length} related indicator(s) shortlisted` : "No confident direct indicator mapping"}</small>
            </div>
            <div className="ad15-links">
              {path.flags.length ? (
                path.flags.slice(0, 3).map((f) => (
                  <button type="button" className="btn btn-sm" key={f.id} title={f.fraud_type} onClick={() => router.push(links.flag(f.id))}>
                    {f.indicator}
                  </button>
                ))
              ) : (
                <button type="button" className="btn btn-sm" onClick={() => router.push(links.flagModule(tp.domain))}>
                  Browse Module {tp.domain} indicators
                </button>
              )}
            </div>
            <label>
              <input type="checkbox" checked={!!ss.flags} onChange={(e) => setStep(tp.key, "flags", e.target.checked)} /> I reviewed these
            </label>
          </div>
          <div className="ad15-stage">
            <div>
              <b>03 · Apply through a guide case</b>
              <small>{path.cases.length ? `${path.cases.length} related case(s) shortlisted` : "No case directly matched"}</small>
            </div>
            <div className="ad15-links">
              {path.cases.length ? (
                path.cases.map((c) => (
                  <button type="button" className="btn btn-sm" key={c.id} onClick={() => router.push(links.caseStudy(c.id))}>
                    {c.title} · p. {c.page}
                  </button>
                ))
              ) : (
                <button type="button" className="btn btn-sm" onClick={() => router.push(links.caseModule(tp.domain))}>
                  Browse Module {tp.domain} cases
                </button>
              )}
            </div>
            <label>
              <input type="checkbox" checked={!!ss.cases} onChange={(e) => setStep(tp.key, "cases", e.target.checked)} /> I reviewed these
            </label>
          </div>
          <div className="ad15-stage ad15-recheck">
            <div>
              <b>04 · Reassess without notes</b>
              <small>{path.qs.length} eligible matched items; aim for ≥80% exact-match score</small>
            </div>
            {path.qs.length ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => startQuiz(tp.key)}>
                Start {Math.min(5, path.qs.length)}-question recheck
              </button>
            ) : (
              <span className="ad15-muted">No sufficiently matched questions; take a Module {tp.domain} mock instead.</span>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="ad15-wrap">
      <div className="ad15-hero">
        <div className="eyebrow">{t("adaptive.hero.eyebrow", "CAFS Study Studio v19 · Fraud Adaptive Revision")}</div>
        <h1>{t("adaptive.hero.title", "Your personalized improvement plan")}</h1>
        <p>
          Your exam mistakes become a linked revision sequence: <b>Study-guide summary → red flags → case study → targeted recheck.</b> Recommendations update when you complete assessments or short quizzes.
        </p>
      </div>
      <div className="ad15-metrics">
        <div>
          <b>
            {completed} / {exams.length}
          </b>
          <small>Formal assessments completed</small>
        </div>
        <div>
          <b>{first.first.length}</b>
          <small>Distinct first-seen questions</small>
        </div>
        <div>
          <b>{reviewSignals}</b>
          <small>Topics with review signals</small>
        </div>
        <div>
          <b>{done}</b>
          <small>Successful rechecks recorded</small>
        </div>
      </div>
      <div className="ad15-panel">
        <h2>{t("adaptive.diag.title", "Diagnosis by module")}</h2>
        <p className="ad15-muted">
          Based on first-seen items from submitted formal assessments. These are internal practice metrics, not a predicted CAFS exam result.
        </p>
        <div className="ad15-domains">
          {mastery.map((x) => (
            <div key={x.d}>
              <b>
                Module {x.d} · {MODULES[x.d]}
              </b>
              <span>{x.pct === null ? "No completed sample" : `${x.pct}% · ${x.n} items`}</span>
              <div className="ad15-track">
                <i style={{ width: `${x.pct || 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="ad15-toolbar">
        <div>
          <h2>{t("adaptive.paths.title", "Prioritized learning paths")}</h2>
          <p className="ad15-muted">
            High error rates and repeated mistakes rise to the top; an 80%+ recheck lowers priority without erasing initial mistakes.
          </p>
        </div>
        <label>
          Module{" "}
          <select id="ad15-domain" value={selectedDomain} onChange={(e) => setSelectedDomain(Number(e.target.value) || 0)}>
            <option value="0">All modules</option>
            {[1, 2, 3].map((d) => (
              <option key={d} value={d}>
                {d} · {MODULES[d]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {ranked.length ? (
        <>
          <div className="ad15-stack">{ranked.slice(0, 12).map(card)}</div>
          {selectedDomain === 0 && ranked.length > 12 && (
            <p className="ad15-muted">
              Showing the top 12 of {ranked.length} review candidates. Filter to one module to view its highest-priority topics.
            </p>
          )}
        </>
      ) : (
        <div className="ad15-panel">
          <h3>{t("adaptive.empty.title", "No weakness profile yet")}</h3>
          <p>
            Complete a chapter assessment or mock exam first. The pathway will then identify missed topics and link the supporting study resources. Until then, use your Fraud Domain Learning Hub for a baseline revision.
          </p>
          <Link className="btn btn-primary" href="/studio/chapters">
            {t("adaptive.empty.open", "Open chapter assessments")}
          </Link>
        </div>
      )}
      <div className="ad15-panel">
        <h2>{t("adaptive.history.title", "Reassessment history")}</h2>
        {state.quizzes.length ? (
          <div className="ad15-history">
            {state.quizzes
              .slice(-12)
              .reverse()
              .map((z, i) => (
                <div key={i}>
                  <span>
                    {new Date(z.at).toLocaleDateString()} · {z.label}
                  </span>
                  <b>
                    {z.correct}/{z.total} · {z.percent}%
                  </b>
                </div>
              ))}
          </div>
        ) : (
          <p className="ad15-muted">No targeted rechecks completed. Finish a short quiz to begin tracking response to revision.</p>
        )}
        <div className="ad15-actions">
          <button type="button" className="btn btn-sm" onClick={exportBackup}>
            {t("adaptive.export", "Export adaptive learning backup")}
          </button>
          <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}>
            {t("adaptive.import", "Restore adaptive learning backup")}
          </button>
          <input
            type="file"
            accept="application/json,.json"
            hidden
            id="ad15-file"
            ref={fileRef}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importBackup(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      <p className="ad15-footer">
        Links are ranked by overlap with original material headings and descriptions, not an artificial AI-generated claim of conceptual equivalence. When no sufficiently reliable match exists, the app links to the relevant module instead. Marking a resource reviewed is a self-attestation; only a scored recheck provides an additional performance observation.
      </p>
    </div>
  );
}
