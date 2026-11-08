"use client";

// Results of a submitted attempt (/studio/results/[id]): score, domain breakdown, next steps and the
// personal revision plan (resultMarkup + drawResultsExtras + v16/v19 additions of the original).

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { reviewHref, getLastMode } from "@/components/studio/exam/examUtils";
import { AdaptiveDashboardCard } from "@/components/studio/adaptive/AdaptiveDashboardCard";
import { FocusTopicCard, MiniBar } from "@/components/studio/practice/parts";
import { downloadResultsCsv } from "@/components/studio/practice/backup";
import { useStartDrill } from "@/components/studio/practice/drillState";
import { pct } from "@/components/studio/practice/helpers";
import { useDb, useTimerMinutes } from "@/lib/studio/db";
import { TITLES, createSession, doneCount, isCorrect } from "@/lib/studio/engine";
import { Icon } from "@/lib/studio/Icon";
import { examHref, pageHref } from "@/lib/studio/nav";
import { useBreadcrumb, useStudioData, useT } from "@/lib/studio/StudioProvider";
import type { ExamQuestion } from "@/lib/studio/types";

type Group = { key: string; domain: number; correct: number; total: number; miss: { q: ExamQuestion; i: number }[]; example: ExamQuestion };

export function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const router = useRouter();
  const { exams } = useStudioData();
  const [db, setDb] = useDb();
  const [timer] = useTimerMinutes();
  const startDrill = useStartDrill();
  useBreadcrumb("Exam results");
  const exam = exams.find((x) => x.id === id);
  const session = db.sessions[id];
  const ready = !!exam && !!session && Array.isArray(session.answers) && session.answers.length === 100 && session.submitted;

  useEffect(() => {
    if (!exam) router.replace(pageHref("overview"));
    else if (!ready) router.replace(examHref(id));
  }, [exam, ready, router, id]);

  if (!exam || !ready) return null;

  const n = doneCount(exam, session);
  const score = session.score ?? 0;
  const parts = exam.type === "chapter" ? [exam.chapter as number] : [1, 2, 3];
  const flaggedCount = session.flags.filter(Boolean).length;

  // v16BuildRationale: weakest domain
  const by = [1, 2, 3]
    .map((d) => {
      const list = exam.questions.map((q, i) => ({ q, i })).filter((x) => x.q.domain === d);
      return { d, total: list.length, correct: list.filter((x) => isCorrect(x.q, session.answers[x.i])).length };
    })
    .filter((x) => x.total);
  by.sort((a, b) => a.correct / a.total - b.correct / b.total);
  const weakest = by[0];
  const weakScore = weakest ? Math.round((weakest.correct / weakest.total) * 100) : 0;

  // drawResultsExtras
  const byTopic = new Map<string, Group>();
  const missed: { q: ExamQuestion; i: number }[] = [];
  exam.questions.forEach((q, i) => {
    const k = q.sourceSection || q.topic;
    let g = byTopic.get(k);
    if (!g) {
      g = { key: k, domain: q.domain, correct: 0, total: 0, miss: [], example: q };
      byTopic.set(k, g);
    }
    g.total++;
    if (isCorrect(q, session.answers[i])) g.correct++;
    else {
      g.miss.push({ q, i });
      missed.push({ q, i });
    }
  });
  const priority = [...byTopic.values()]
    .filter((g) => g.miss.length)
    .sort((a, b) => b.miss.length - a.miss.length || a.correct / a.total - b.correct / b.total)
    .slice(0, 6);
  const singles = exam.questions.filter((q) => q.kind === "single").length;
  const multi = 100 - singles;
  const singleRight = exam.questions.reduce((c, q, i) => c + (q.kind === "single" && isCorrect(q, session.answers[i]) ? 1 : 0), 0);
  const multiRight = exam.questions.reduce((c, q, i) => c + (q.kind === "multi" && isCorrect(q, session.answers[i]) ? 1 : 0), 0);

  function review(mode: "incorrect" | "all") {
    const first = mode === "incorrect" ? exam!.questions.findIndex((q, j) => !isCorrect(q, session.answers[j])) : 0;
    setDb((prev) => {
      const s = prev.sessions[id];
      return s ? { ...prev, sessions: { ...prev.sessions, [id]: { ...s, current: first < 0 ? 0 : first } } } : prev;
    });
    router.push(reviewHref(id, mode));
    window.scrollTo(0, 0);
  }

  function restart() {
    if (!window.confirm("Start a fresh attempt? The previous answers for this exam will be replaced. Your completed-score history will remain available in insights.")) return;
    const fresh = createSession(exams, id, timer, getLastMode());
    setDb((prev) => ({ ...prev, sessions: { ...prev.sessions, [id]: fresh } }));
    router.push(examHref(id));
    window.scrollTo(0, 0);
  }

  return (
    <>
      <AdaptiveDashboardCard />
      {["mock-1", "mock-2", "mock-3"].includes(id) ? (
        <aside role="note" style={{ border: "1px solid #e7c680", borderLeft: "4px solid #bb8733", background: "#fff8e8", color: "#674516", borderRadius: 9, padding: "13px 16px", margin: "0 0 18px", fontSize: 13 }}>
          <strong>{t("results.v20.title", "v20 independent-form quality notice.")}</strong>{" "}
          {t(
            "results.v20.text",
            "The remaining 116 provisional items in Forms B and C were individually rewritten, with contextual questions, distractors and rationales. All 161 form replacements remain mapped to study-guide sections and pending independent subject-matter sign-off. Scores are practice feedback, not calibrated CAFS readiness estimates.",
          )}
        </aside>
      ) : null}
      <section className="v16-result-route">
        <div>
          <span className="v16-eyebrow">{t("results.route.eyebrow", "RECOMMENDED NEXT ACTION")}</span>
          <h3>{t("results.route.title", "Turn your score into a fraud revision plan")}</h3>
          <p>
            {weakest ? (
              <>
                {t("results.route.weak1", "Your lowest-performing domain was")} <b>{TITLES[weakest.d]}</b> ({weakScore}%).{" "}
                {t("results.route.weak2", "Review its concepts, fraud indicators and case examples before your next assessment.")}
              </>
            ) : (
              t("results.route.none", "Use the adaptive learning pathway to analyze missed questions and reinforce relevant fraud topics.")
            )}
          </p>
        </div>
        <div className="v16-actionline">
          <button className="btn btn-primary" onClick={() => router.push(pageHref("adaptivePath"))}>
            {t("results.route.adaptive", "Open adaptive revision →")}
          </button>
          <button className="btn" onClick={() => router.push(pageHref("redFlags"))}>
            {t("results.route.redFlags", "Fraud warning indicators")}
          </button>
        </div>
      </section>
      <div className="page-intro">
        <div className="eyebrow muted">{t("results.eyebrow", "ASSESSMENT RESULTS")}</div>
        <h1>{t("results.title", "Here’s how you performed.")}</h1>
        <p>
          {exam.title} · {t("results.scored", "Scored with exact-match selection for multi-select questions.")}
        </p>
      </div>
      <div className="result-panel score-banner">
        <div className="score-ring" style={{ "--progress": `${score}%` } as React.CSSProperties}>
          <div className="score-inner">
            <strong>{score}%</strong>
            <small>{t("results.yourScore", "Your score")}</small>
          </div>
        </div>
        <div className="results-detail">
          <div className="eyebrow muted">{t("results.completed", "COMPLETED PRACTICE EXAM")}</div>
          <h1>{score} out of 100</h1>
          <p>
            {session.autoSubmitted ? t("results.timeUp", "Your time expired, so this attempt was submitted automatically.") + " " : ""}
            {t("results.practiceScore", "This is a practice score, not an official ACAMS passing determination. Review missed questions to sharpen topic-level knowledge.")}
          </p>
          <div className="hero-buttons" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={() => review("incorrect")}>
              {t("results.reviewMissed", "Review missed questions")} <Icon name="right" />
            </button>
            <button className="btn" onClick={() => review("all")}>
              {t("results.reviewAll", "Review all answers")}
            </button>
          </div>
        </div>
      </div>
      <div className="result-kpis">
        <div className="kpi">
          <b>{score}</b>
          <small>{t("results.kpi.correct", "Correct responses")}</small>
        </div>
        <div className="kpi">
          <b>{n - score}</b>
          <small>{t("results.kpi.incorrect", "Incorrect completed")}</small>
        </div>
        <div className="kpi">
          <b>{100 - n}</b>
          <small>{t("results.kpi.unanswered", "Unanswered / partial")}</small>
        </div>
        <div className="kpi">
          <b>{flaggedCount}</b>
          <small>{t("results.kpi.flagged", "Flagged for review")}</small>
        </div>
      </div>
      <div className="results-row">
        <div className="result-panel">
          <h3>{t("results.byDomain", "Performance by domain")}</h3>
          {parts.map((d) => {
            const pairs = exam.questions.map((q, i) => ({ q, i })).filter((x) => x.q.domain === d);
            const m = pairs.filter((x) => isCorrect(x.q, session.answers[x.i])).length;
            const p = pairs.length ? Math.round((m / pairs.length) * 100) : NaN;
            return (
              <div className="domain-row" key={d}>
                <div className="domain-label">
                  <span>{TITLES[d]}</span>
                  <b>
                    {m} / {pairs.length} · {p}%
                  </b>
                </div>
                <div className="domain-line">
                  <span style={{ width: `${p}%`, background: `var(--d${d})` }}></span>
                </div>
              </div>
            );
          })}
          <p className="notice">{t("results.noPartial", "Multi-select requires exactly the correct combination. No partial credit.")}</p>
        </div>
        <div className="result-panel">
          <h3>{t("results.next", "Next steps")}</h3>
          <div style={{ display: "grid", gap: 9 }}>
            <button className="btn btn-primary" onClick={() => review("incorrect")}>
              <Icon name="target" /> {t("results.studyIncorrect", "Study incorrect answers")}
            </button>
            <button className="btn" onClick={() => downloadResultsCsv(exam, session)}>
              <Icon name="download" /> {t("results.csv", "Export results as CSV")}
            </button>
            <button className="btn" onClick={restart}>
              <Icon name="refresh" /> {t("results.retake", "Retake this exam")}
            </button>
            <button className="btn btn-quiet" onClick={() => router.push(pageHref("overview"))}>
              {t("results.dashboard", "Return to dashboard")} <Icon name="right" />
            </button>
          </div>
        </div>
      </div>
      <div id="topicReport">
        <div className="section-heading">
          <div>
            <h2>{t("results.plan.title", "Your personal revision plan")}</h2>
            <p>{t("results.plan.sub", "Specific study-guide sections to revisit, ranked by the mistakes in this attempt.")}</p>
          </div>
          <button className="btn btn-sm" onClick={() => router.push(pageHref("insights"))}>
            {t("results.plan.insights", "Full preparation insights")} <Icon name="right" />
          </button>
        </div>
        <div className="insight-columns">
          <section className="intel-card">
            <h3>{t("results.plan.priority", "Priority improvement topics")}</h3>
            <p>{t("results.plan.priorityText", "Choose a topic to rehearse relevant questions already in this study bank.")}</p>
            {priority.length ? (
              priority.map((g) => <FocusTopicCard key={g.key} g={{ key: g.key, domain: g.domain, total: g.total, wrong: g.miss.length, example: g.miss[0]?.q || g.example }} onDrill={startDrill} label={t("results.plan.focus", "Focus practice")} />)
            ) : (
              <div className="empty">{t("results.plan.none", "No missed questions in this exam. Try a different assessment with unfamiliar scenarios.")}</div>
            )}
          </section>
          <section className="intel-card">
            <h3>{t("results.plan.suggest", "What your mistakes suggest")}</h3>
            <p>{t("results.plan.suggestText", "Use these indicators to plan the next study session.")}</p>
            <div className="mastery-row">
              <div className="mastery-top">
                <strong>{t("results.plan.single", "Single-best-answer")}</strong>
                <b>
                  {singleRight}/{singles} · {pct(singleRight, singles)}%
                </b>
              </div>
              <MiniBar v={pct(singleRight, singles)} />
            </div>
            <div className="mastery-row">
              <div className="mastery-top">
                <strong>{t("results.plan.multi", "Multi-select, exact match")}</strong>
                <b>
                  {multiRight}/{multi} · {pct(multiRight, multi)}%
                </b>
              </div>
              <MiniBar v={pct(multiRight, multi)} />
            </div>
            <div className="mastery-row">
              <div className="mastery-top">
                <strong>{t("results.plan.skipped", "Skipped or incomplete")}</strong>
                <b>{100 - n} questions</b>
              </div>
              <div className="mastery-sub">{t("results.plan.skippedText", "These are counted as incorrect, including partially answered multi-select.")}</div>
            </div>
            <div className="missed-breakdown">
              <strong>{t("results.plan.steps", "Recommended next steps")}</strong>
              <p>
                {missed.length ? (
                  <>
                    {t("results.plan.start", "Start with")} <b>{priority[0].key}</b>
                    {t("results.plan.startRest", ", read the study-guide section, and explain in your own words why the correct answer is better than each alternative. Then use Focus practice for reinforcement.")}
                  </>
                ) : (
                  t("results.plan.maintain", "Maintain accuracy using new questions, not just retakes of familiar scenarios.")
                )}
              </p>
            </div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => review("incorrect")}>
              <Icon name="book" /> {t("results.plan.reviewExpl", "Review missed explanations")}
            </button>
          </section>
        </div>
      </div>
      <div className="callout">
        <Icon name="info" />
        <div>
          <strong>{t("results.interpret.title", "How to interpret this score")}</strong>
          <p>{t("results.interpret.text", "The study recommendations are based on your mistakes and the exact study-guide headings embedded in the questions. They are not official ACAMS predictions. Scores on repeated questions may overstate unseen-question performance.")}</p>
        </div>
      </div>
    </>
  );
}
