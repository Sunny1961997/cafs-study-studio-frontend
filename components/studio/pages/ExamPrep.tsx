"use client";

import { useBreadcrumb, useStudioData, useT } from "@/lib/studio/StudioProvider";
import { getStats } from "@/lib/studio/engine";
import { useDb } from "@/lib/studio/db";
import { useStoredJSON } from "@/lib/studio/store";
import { GoButton } from "@/components/studio/study/GoButton";
import { COACH_FALLBACK, COACH_KEY, DATE_RE, daysLeft, firstSeenDomains, normaliseCoach, type CoachState } from "@/components/studio/study/coach";

const DOMAIN_NAMES = ["", "Fraud Risk Management", "Fraud Detection & Analytics", "Fraud Investigations"];
const CORE_IDS = ["chapter-1", "chapter-2", "chapter-3", "mock-1", "mock-2", "mock-3"];

export function ExamPrepPage() {
  const t = useT();
  const { exams, tasks, summaries } = useStudioData();
  const [db] = useDb();
  const [stored, setStored] = useStoredJSON<CoachState>(COACH_KEY, COACH_FALLBACK);
  useBreadcrumb(t("examPrep.breadcrumb", "Exam Prep Coach"));

  const cs = normaliseCoach(stored);
  const save = (next: CoachState) => setStored({ date: next.date, done: next.done });

  const doneCount = tasks.filter((x) => cs.done[x.id]).length;
  const total = tasks.length;
  const pct = total ? Math.round((100 * doneCount) / total) : 0;
  const days = daysLeft(cs.date);
  const dayNames: Record<number, string> = {
    1: t("examPrep.day.1", "Session 1 · Analytics"),
    2: t("examPrep.day.2", "Session 2 · Risk management"),
    3: t("examPrep.day.3", "Session 3 · Investigations"),
    4: t("examPrep.day.4", "Session 4 · Full mock & diagnostics"),
    5: t("examPrep.day.5", "Session 5 · Final consolidation"),
  };
  const stage = days === 0 ? "Exam date reached" : days === 1 ? "1 day remaining" : `${days} days remaining`;
  const topicCount = summaries.reduce((n, s) => n + (Array.isArray(s.topics) ? s.topics.length : 0), 0);

  const stat = getStats(exams, db);
  const completed = exams.filter((x) => CORE_IDS.includes(x.id) && db.sessions?.[x.id]?.submitted);
  const mocks = completed.filter((x) => x.type === "mock");
  const chapters = completed.filter((x) => x.type === "chapter");
  const ds = firstSeenDomains(exams, db);
  const worst = ds
    .filter((d) => d.total >= 5)
    .sort((a, b) => a.correct / a.total - b.correct / b.total)[0];
  let next: { name: string; why: string; page: string };
  if (worst && worst.correct / worst.total < 0.8) {
    next = {
      name: `Revisit ${DOMAIN_NAMES[worst.domain]}`,
      why: `Your first-seen accuracy on ${worst.total} questions is ${Math.round((worst.correct / worst.total) * 100)}%. Review the missed concepts before another assessment.`,
      page: "insights",
    };
  } else if (chapters.length < 3) {
    const c = exams.find((x) => x.type === "chapter" && !db.sessions?.[x.id]?.submitted);
    next = {
      name: `Complete ${c?.short || "a chapter assessment"}`,
      why: "An unseen chapter assessment provides the best starting evidence of understanding. Review missed answers before moving on.",
      page: "chapters",
    };
  } else if (mocks.length < 2) {
    next = {
      name: "Take a full mixed mock",
      why: "Use unfamiliar questions with the exam timer, then review your domain breakdown and closest distractors.",
      page: "mocks",
    };
  } else {
    next = {
      name: "Focus on your next weak concept",
      why: "Revisit topics in My Insights, explain them without notes, then validate with unfamiliar questions.",
      page: "insights",
    };
  }

  return (
    <>
      <div className="ad15-shortcut">
        <div>
          <b>{t("examPrep.ad15.title", "Fraud Adaptive Learning · PERSONALIZED")}</b>
          <p>{t("examPrep.ad15.text", "Study your weak topics through linked chapter summaries, red flags, study-guide cases and scored rechecks.")}</p>
        </div>
        <GoButton page="adaptivePath" className="btn btn-primary btn-sm">
          {t("examPrep.ad15.button", "Open my improvement plan")}
        </GoButton>
      </div>
      <div className="coach-hero">
        <div>
          <div className="coach-eyebrow">{t("examPrep.eyebrow", "YOUR PERSONAL ROUTE TO SUCCESS")}</div>
          <h1>{t("examPrep.title", "Exam Prep Coach")}</h1>
          <p>
            {t(
              "examPrep.intro",
              "Follow a realistic study sequence, track your revision, reinforce concepts that you miss and focus on what you can explain without notes. Everything on this page works offline.",
            )}
          </p>
        </div>
        <div className="coach-countdown">
          <b>{days}</b>
          <span>
            {stage} · Exam date {cs.date}
          </span>
        </div>
      </div>
      <div className="coach-kpis">
        <div className="coach-kpi">
          <strong>{completed.length}/6</strong>
          <span>{t("examPrep.kpi.core", "Core assessments completed")}</span>
        </div>
        <div className="coach-kpi">
          <strong>
            {doneCount}/{total}
          </strong>
          <span>{t("examPrep.kpi.tasks", "Revision tasks completed")}</span>
        </div>
        <div className="coach-kpi">
          <strong>{stat.best === null ? "—" : `${stat.best}%`}</strong>
          <span>{t("examPrep.kpi.best", "Best completed mock/chapter result")}</span>
        </div>
      </div>
      <div className="coach-grid">
        <section className="coach-panel">
          <div className="coach-eyebrow">{t("examPrep.next.eyebrow", "Your next best action")}</div>
          <h2>{next.name}</h2>
          <p>{next.why}</p>
          <div className="coach-inline">
            <GoButton page={next.page}>{t("examPrep.next.open", "Open recommended section")}</GoButton>
            <GoButton page="insights">{t("examPrep.next.insights", "View preparation insights")}</GoButton>
          </div>
          <div className="coach-callout">
            <strong>{t("examPrep.target.label", "Practice readiness target:")}</strong>{" "}
            {t(
              "examPrep.target.text",
              "Aim for at least 85% on unfamiliar mixed mocks, with balanced performance across all three domains. This is a study benchmark, not an official pass probability or guarantee.",
            )}
          </div>
        </section>
        <section className="coach-panel">
          <div className="coach-eyebrow">{t("examPrep.method.eyebrow", "Make the most of your study time")}</div>
          <h2>{t("examPrep.method.title", "The three-pass recall method")}</h2>
          <div className="coach-rule">
            <strong>{t("examPrep.method.1.title", "1 · Recall without notes")}</strong>
            <p>{t("examPrep.method.1.text", "Read the prompt, close the explanation and state the key rule aloud.")}</p>
          </div>
          <div className="coach-rule">
            <strong>{t("examPrep.method.2.title", "2 · Explain the alternatives")}</strong>
            <p>{t("examPrep.method.2.text", "For MCQs, identify precisely why the closest competing option is weaker.")}</p>
          </div>
          <div className="coach-rule">
            <strong>{t("examPrep.method.3.title", "3 · Revisit after a break")}</strong>
            <p>{t("examPrep.method.3.text", "Return to missed concepts in another session; avoid simply remembering their lettered answers.")}</p>
          </div>
        </section>
      </div>
      <div className="coach-grid">
        <section className="coach-panel">
          <div className="coach-eyebrow">{t("examPrep.plan.eyebrow", "Your final revision sessions")}</div>
          <h2>{t("examPrep.plan.title", "Five-session study plan")}</h2>
          <p>{t("examPrep.plan.text", "Complete the sessions in order, adjusting effort to your weakest topics and remaining time.")}</p>
          <label className="muted small" htmlFor="coachDate">
            {t("examPrep.plan.date", "Exam date")}
          </label>{" "}
          <input
            id="coachDate"
            className="text-input"
            type="date"
            value={cs.date}
            style={{ maxWidth: 170, margin: "5px 0 12px" }}
            onChange={(ev) => {
              if (DATE_RE.test(ev.target.value)) save({ ...cs, date: ev.target.value });
            }}
          />
          <div className="coach-progress">
            <i style={{ width: `${pct}%` }} />
          </div>
          <div className="muted small">{pct}% complete · checked activities are saved on this browser</div>
          {[1, 2, 3, 4, 5].map((day) => {
            const a = tasks.filter((x) => x.day === day);
            const n = a.filter((x) => cs.done[x.id]).length;
            return (
              <div className="coach-day" key={day}>
                <div className="coach-day-title">
                  <span>{dayNames[day]}</span>
                  <small>
                    {n}/{a.length}
                  </small>
                </div>
                {a.map((x) => (
                  <label className={`coach-task ${cs.done[x.id] ? "checked" : ""}`} key={x.id}>
                    <input
                      type="checkbox"
                      data-coach-task={x.id}
                      checked={Boolean(cs.done[x.id])}
                      onChange={(ev) => save({ ...cs, done: { ...cs.done, [x.id]: ev.target.checked } })}
                    />
                    <span>
                      <b>{x.name}</b>
                      <small>{x.desc}</small>
                    </span>
                  </label>
                ))}
              </div>
            );
          })}
          <div className="coach-inline">
            <GoButton page="memorize">{t("examPrep.plan.memorize", "Study memorisation cards")}</GoButton>
            <GoButton page="sprints">{t("examPrep.plan.drill", "Start timed module drill")}</GoButton>
            <GoButton page="mocks">{t("examPrep.plan.mocks", "Open full mocks")}</GoButton>
          </div>
        </section>
        <section className="coach-panel">
          <div className="coach-eyebrow">{t("examPrep.profile.eyebrow", "First-seen knowledge profile")}</div>
          <h2>{t("examPrep.profile.title", "Where to direct revision")}</h2>
          <p>{t("examPrep.profile.text", "This summary uses only your saved core-exam results and does not count supplementary practice.")}</p>
          {ds.some((d) => d.total) ? (
            ds.map((d) => (
              <div className="mastery-row" key={d.domain}>
                <div className="mastery-top">
                  <strong>{DOMAIN_NAMES[d.domain]}</strong>
                  <b>{d.total ? `${Math.round((100 * d.correct) / d.total)}%` : "Not tested"}</b>
                </div>
                <div className="coach-progress">
                  <i style={{ width: `${d.total ? (100 * d.correct) / d.total : 0}%` }} />
                </div>
                <div className="small muted">
                  {d.total} first-seen questions ·{" "}
                  {d.total < 15
                    ? "Early signal; more coverage needed"
                    : d.correct / d.total >= 0.85
                      ? "Strong on sampled material"
                      : d.correct / d.total >= 0.8
                        ? "Near target; review mistakes"
                        : "Revisit weaker concepts"}
                </div>
              </div>
            ))
          ) : (
            <div className="coach-empty">
              {t("examPrep.profile.empty", "No core assessment results yet. Take a chapter exam to unlock personalized domain recommendations.")}
            </div>
          )}
          <h3>{t("examPrep.effort.title", "How to allocate effort")}</h3>
          <p>
            {t(
              "examPrep.effort.text",
              "Use the actual 40% / 30% / 30% domain weighting as a coverage guide: Fraud Risk Management 40%, Analytics 30%, Investigations 30%. Spend additional revision time on domains where your first-attempt answers show gaps.",
            )}
          </p>
          <div className="coach-rule">
            <strong>{t("examPrep.rule.single.title", "Single-best-answer questions")}</strong>
            <p>
              {t(
                "examPrep.rule.single.text",
                "Look for the option that addresses the main risk, correct sequence and evidence, not just a statement that could be true in general.",
              )}
            </p>
          </div>
          <div className="coach-rule">
            <strong>{t("examPrep.rule.multi.title", "Select TWO / Select THREE")}</strong>
            <p>
              {t(
                "examPrep.rule.multi.text",
                "Evaluate each answer independently. Exact-match practice scoring requires all correct options and no incorrect choices.",
              )}
            </p>
          </div>
          <div className="coach-rule">
            <strong>{t("examPrep.rule.final.title", "Final-day preparation")}</strong>
            <p>
              {t(
                "examPrep.rule.final.text",
                "Review your shortest weak-concept list, verify exam logistics and rest. Avoid exhaustive question marathons.",
              )}
            </p>
          </div>
          <GoButton page="insights">{t("examPrep.profile.insights", "Open My Insights")}</GoButton>
        </section>
      </div>
      <section className="coach-panel">
        <div className="coach-eyebrow">{t("examPrep.tools.eyebrow", "LAST-LOOK REVISION TOOLS")}</div>
        <h2>{t("examPrep.tools.title", "Revision briefs and key memory references")}</h2>
        <p>
          {t(
            "examPrep.tools.text",
            "Consolidated reference sheets for each of the three domains, plus the laws, formula names, abbreviations, case-study figures and high-yield numerical rules worth recalling.",
          )}
        </p>
        <div className="coach-inline">
          <GoButton page="cheatSheets">{t("examPrep.tools.briefs", "Open revision briefs")}</GoButton>
          <GoButton page="namesNumbers">{t("examPrep.tools.terms", "Review key terms and figures")}</GoButton>
          <GoButton page="memorize">{t("examPrep.tools.recall", "Practise recall questions")}</GoButton>
        </div>
        <div className="coach-rule">
          <strong>{t("examPrep.tools.focus.title", "Exam focus")}</strong>
          <p>
            {t(
              "examPrep.tools.focus.text",
              "Remember the concept and when it applies. Case-study amounts are examples, not universal transaction-monitoring thresholds; regional laws can have exceptions.",
            )}
          </p>
        </div>
      </section>
      <p className="coach-foot">
        {t(
          "examPrep.foot",
          "This is an independent, unofficial learning tool based on your provided CAFS Study Guide. Use unfamiliar timed questions and the official guide to validate understanding. Practice scores cannot guarantee a real examination result.",
        )}
      </p>
      <div className="sum13-shortcut">
        <strong>{t("examPrep.sum13.title", "Chapter Summaries")}</strong>
        <p>
          {topicCount} {t("examPrep.sum13.text", "structured revision topics across all three CAFS chapters. Review key concepts, examples and exam-focus points.")}
        </p>
        <GoButton page="chapterSummaries" className="btn btn-sm btn-primary">
          {t("examPrep.sum13.button", "Open chapter summaries")}
        </GoButton>
      </div>
    </>
  );
}
