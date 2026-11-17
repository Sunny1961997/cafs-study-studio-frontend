"use client";

import { useRouter } from "next/navigation";
import { AdaptiveDashboardCard } from "@/components/studio/adaptive/AdaptiveDashboardCard";
import { useDb } from "@/lib/studio/db";
import { TITLES } from "@/lib/studio/engine";
import { Icon } from "@/lib/studio/Icon";
import { examHref, pageHref } from "@/lib/studio/nav";
import { useStudioData, useT } from "@/lib/studio/StudioProvider";
import { resetAdaptiveState } from "@/components/studio/practice/backup";
import { useStartDrill } from "@/components/studio/practice/drillState";
import { aggregateKnowledge, evidenceSamples, pct, readinessInsight } from "@/components/studio/practice/helpers";
import { FocusTopicCard, MiniBar, StatCard } from "@/components/studio/practice/parts";

const dateLabel = (at?: number) => new Date(at || Date.now()).toLocaleDateString();

export function InsightsPage() {
  const t = useT();
  const router = useRouter();
  const { exams } = useStudioData();
  const [db, setDb] = useDb();
  const startDrill = useStartDrill();

  const completed = exams.filter((e) => db.sessions[e.id]?.submitted);
  const history = Object.values(db.history).flat();
  const raw = evidenceSamples(exams, db);
  const analysis = aggregateKnowledge(raw.first);
  const avg = completed.length ? Math.round(completed.reduce((v, e) => v + (db.sessions[e.id].score ?? 0), 0) / completed.length) : null;
  const readiness = readinessInsight(exams, db, raw.records, analysis.domains);
  const sortedWeak = analysis.topics
    .filter((g) => g.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong || a.correct / a.total - b.correct / b.total)
    .slice(0, 7);
  const strong = analysis.topics
    .filter((g) => g.total >= 3 && pct(g.correct, g.total) >= 85)
    .sort((a, b) => b.total - a.total || pct(b.correct, b.total) - pct(a.correct, a.total))
    .slice(0, 5);
  const typeRows: [string, { total: number; correct: number }][] = [
    ["Single best answer", analysis.types.get("single")!],
    ["Multi-select (exact match)", analysis.types.get("multi")!],
  ];
  const trend = Object.keys(db.history)
    .flatMap((id) => (db.history[id] || []).map((v) => ({ ...v, id })))
    .sort((a, b) => a.at - b.at);
  const focusLabel = t("insights.focusPractice", "Focus practice");

  function clearAll() {
    if (window.confirm("Delete all progress and score history saved by this unified exam file on this browser?")) {
      setDb({ sessions: {}, history: {}, drills: [] });
      resetAdaptiveState();
      router.push(pageHref("overview"));
    }
  }

  return (
    <>
      <AdaptiveDashboardCard />
      <div className="page-intro">
        <div className="eyebrow muted">{t("insights.eyebrow", "PERSONALIZED PREPARATION INTELLIGENCE")}</div>
        <h1>{t("insights.title", "Your CAFS learning profile")}</h1>
        <p>{t("insights.intro", "See where you are improving, what you repeatedly miss, and exactly which study-guide topics to revisit.")}</p>
      </div>
      <section className="prep-banner">
        <div>
          <div className="eyebrow muted">{t("insights.readinessEyebrow", "EVIDENCE-BASED READINESS CHECK")}</div>
          <h2>{readiness.label}</h2>
          <p>{readiness.detail}</p>
        </div>
        <div className="prep-level">
          <strong>{raw.first.length} distinct questions</strong>
          <span>{t("insights.distinctNote", "Counted once each for topic and domain accuracy, even when they reappear in another exam.")}</span>
        </div>
      </section>
      <div className="stats-grid">
        <StatCard title={t("insights.statAttempts", "Completed attempts")} num={history.length || raw.records.length} detail={t("insights.statAttemptsNote", "Historical scores; older retakes may lack detail")} icon="check" />
        <StatCard title={t("insights.statFirst", "First-seen accuracy")} num={raw.first.length ? pct(raw.first.filter((x) => x.ok).length, raw.first.length) + "%" : "—"} detail={t("insights.statFirstNote", "Across distinct question texts")} icon="target" />
        <StatCard title={t("insights.statAvg", "Average current score")} num={avg === null ? "—" : avg + "%"} detail={t("insights.statAvgNote", "Across completed current exam sessions")} icon="chart" />
        <StatCard title={t("insights.statDrills", "Focus drills completed")} num={db.drills?.length || 0} detail={t("insights.statDrillsNote", "Practice does not change exam scores")} icon="book" />
      </div>
      <div className="section-heading">
        <div>
          <h2>{t("insights.knowledgeTitle", "Knowledge and accuracy")}</h2>
          <p>{t("insights.knowledgeNote", "Figures below use first exposure to each distinct question text; they are not official exam scores.")}</p>
        </div>
      </div>
      <div className="insight-columns">
        <section className="intel-card">
          <h3>{t("insights.domainTitle", "Domain strengths & gaps")}</h3>
          <p>{t("insights.domainNote", "Each domain is shown with its actual number of distinct questions seen.")}</p>
          {analysis.domains.map((d) => (
            <div className="mastery-row" key={d.domain}>
              <div className="mastery-top">
                <strong>{TITLES[d.domain]}</strong>
                <b>{d.total ? pct(d.correct, d.total) + "%" : "—"}</b>
              </div>
              <MiniBar v={pct(d.correct, d.total)} />
              <div className="mastery-sub">
                {d.correct}/{d.total} first-seen correct · {d.total < 15 ? "Insufficient evidence for a firm domain conclusion" : d.correct / d.total >= 0.85 ? "Strong on sampled material" : d.correct / d.total >= 0.7 ? "Developing; continue practice" : "Needs targeted review"}
              </div>
            </div>
          ))}
        </section>
        <section className="intel-card">
          <h3>{t("insights.typeTitle", "Question-type breakdown")}</h3>
          <p>{t("insights.typeNote", "Check whether close distractors or multi-select combinations are the bigger obstacle.")}</p>
          {typeRows.map(([name, ty]) => (
            <div className="mastery-row" key={name}>
              <div className="mastery-top">
                <strong>{name}</strong>
                <b>{ty.total ? pct(ty.correct, ty.total) + "%" : "—"}</b>
              </div>
              <MiniBar v={pct(ty.correct, ty.total)} />
              <div className="mastery-sub">
                {ty.correct} correct out of {ty.total} distinct first-seen questions
              </div>
            </div>
          ))}
          <div className="missed-breakdown">
            <strong>{t("insights.readTitle", "How to read these measures")}</strong>
            <p>{t("insights.readBody", "Unanswered questions count as incorrect. For multi-select, you must identify every correct choice and no wrong choices. A familiar question answered correctly on retake does not add another point to first-seen mastery.")}</p>
          </div>
        </section>
      </div>
      <div className="insight-columns">
        <section className="intel-card">
          <h3>{t("insights.priorityTitle", "Your priority study list")}</h3>
          <p>{t("insights.priorityNote", "Ranked by mistakes. One or two observations are an early signal, not proof of a lasting weakness.")}</p>
          {sortedWeak.length ? sortedWeak.map((g) => <FocusTopicCard key={g.domain + g.key} g={g} onDrill={startDrill} label={focusLabel} />) : <div className="empty">{t("insights.priorityEmpty", "Complete an exam to identify specific improvement topics.")}</div>}
        </section>
        <section className="intel-card">
          <h3>{t("insights.strengthTitle", "Where you’re showing strength")}</h3>
          <p>{t("insights.strengthNote", "Only study-guide topics with at least three distinct first-seen questions and 85% or higher accuracy appear as evidence of strength.")}</p>
          {strong.length ? (
            strong.map((g) => (
              <div className="mastery-row" key={g.domain + g.key}>
                <div className="mastery-top">
                  <strong>{g.key}</strong>
                  <b>{pct(g.correct, g.total)}%</b>
                </div>
                <MiniBar v={pct(g.correct, g.total)} />
                <div className="mastery-sub">
                  Domain {g.domain} · {g.correct}/{g.total} correct · sampled topic
                </div>
              </div>
            ))
          ) : (
            <div className="empty">{t("insights.strengthEmpty", "Not enough repeated coverage of individual study-guide topics yet to identify reliable strengths. This is normal early on.")}</div>
          )}
          <div className="missed-breakdown">
            <strong>{t("insights.nextTitle", "Next study session")}</strong>
            <p>{sortedWeak.length ? `Revisit “${sortedWeak[0].key}”, write a one-sentence decision rule, then rehearse it in Focus practice.` : t("insights.nextEmpty", "Take a new chapter or mixed assessment to build evidence.")}</p>
          </div>
        </section>
      </div>
      <div className="section-heading">
        <div>
          <h2>{t("insights.historyTitle", "Exam history & progress")}</h2>
          <p>{t("insights.historyNote", "Track practice scores separately from first-seen mastery.")}</p>
        </div>
      </div>
      <div className="insight-columns">
        <section className="intel-card">
          <h3>{t("insights.latestTitle", "Latest completed examinations")}</h3>
          <p>{t("insights.latestNote", "Open an exam to see its full recommendations and answer explanations.")}</p>
          {completed.length ? (
            completed.map((e) => (
              <div className="insight-exam" key={e.id}>
                <div>
                  <b>{e.name}</b>
                  <div className="small muted">
                    {dateLabel(db.sessions[e.id].submittedAt)} · {e.type === "chapter" ? "Chapter" : "Mixed mock"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <strong>{db.sessions[e.id].score}%</strong>
                  <button className="btn btn-sm" onClick={() => router.push(examHref(e.id))}>
                    View <Icon name="right" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty">{t("insights.latestEmpty", "Your completed exams will appear here.")}</div>
          )}
        </section>
        <section className="intel-card">
          <h3>{t("insights.trendTitle", "Score trend")}</h3>
          <p>{t("insights.trendNote", "Exam percentages in completion order, including retakes. Repeated items can inflate scores.")}</p>
          {trend.length ? (
            trend.slice(-10).map((r, i) => (
              <div className="mastery-row" key={i}>
                <div className="mastery-top">
                  <strong>
                    {exams.find((e) => e.id === r.id)?.short || r.id} · {dateLabel(r.at)}
                  </strong>
                  <b>{r.score}%</b>
                </div>
                <MiniBar v={r.score} />
              </div>
            ))
          ) : (
            <div className="empty">{t("insights.trendEmpty", "No scored exam attempts yet.")}</div>
          )}
        </section>
      </div>
      <div className="callout">
        <Icon name="info" />
        <div>
          <strong>{t("insights.limitsTitle", "Important interpretation limits")}</strong>
          <p>{t("insights.limitsBody", "This platform uses your uploaded, unofficial study-guide-based question banks. Topics with fewer than three distinct first-seen observations are provisional, and repeated or memorized questions can overstate readiness. Older score-only history cannot reconstruct which concepts you missed on earlier retakes. Focus practice uses existing questions and is a revision tool, not new independent exam evidence.")}</p>
        </div>
      </div>
      <div style={{ marginTop: 19 }}>
        <button className="btn btn-red btn-sm" onClick={clearAll}>
          {t("insights.clearAll", "Clear all unified progress")}
        </button>
      </div>
    </>
  );
}
