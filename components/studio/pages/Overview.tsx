"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AdaptiveDashboardCard } from "@/components/studio/adaptive/AdaptiveDashboardCard";
import { ExamCard, LearningToolsPanel, PageButton, QuickBar } from "@/components/studio/dashboard/parts";
import { useOpenExam } from "@/components/studio/exam/useOpenExam";
import { downloadBackup, restoreBackup } from "@/components/studio/practice/backup";
import { StatCard } from "@/components/studio/practice/parts";
import { GoButton } from "@/components/studio/study/GoButton";
import { useDb, useTimerMinutes } from "@/lib/studio/db";
import { getStats } from "@/lib/studio/engine";
import { Icon } from "@/lib/studio/Icon";
import { pageHref } from "@/lib/studio/nav";
import { useStudioData, useT } from "@/lib/studio/StudioProvider";

const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
const TIMERS: [number, string][] = [
  [0, "Untimed"],
  [90, "90 minutes"],
  [120, "120 minutes"],
  [150, "150 minutes"],
  [175, "175 minutes"],
  [180, "180 minutes"],
];

// The v18 content-revision notice was shown once when the studio first opened (then replaced by any redraw).
let revisionNoticeSeen = false;

export function OverviewPage() {
  const t = useT();
  const router = useRouter();
  const { exams, bank, kit, ikData, summaries } = useStudioData();
  const [db] = useDb();
  const [timer, setTimer] = useTimerMinutes();
  const { openExam, dialog } = useOpenExam();
  const restoreRef = useRef<HTMLInputElement>(null);
  const [showNotice] = useState(() => !revisionNoticeSeen);
  useEffect(() => {
    revisionNoticeSeen = true;
  }, []);

  const s = getStats(exams, db);
  const perExam = exams[0]?.questions.length ?? 100;
  const total = exams.reduce((n, e) => n + e.questions.length, 0);
  const topicCount = summaries.reduce((n, x) => n + (Array.isArray(x.topics) ? x.topics.length : 0), 0);
  const word = NUMBER_WORDS[exams.length] ?? String(exams.length);

  return (
    <>
      {showNotice ? (
        <div className="v18-revision-notice">
          <strong>{t("dash.v18.title", "Content revision v18:")}</strong>{" "}
          {t("dash.v18.text", "The Domain 1 and Domain 2 chapter assessments contain 117 rewritten questions. Past chapter attempts are archived, not scored against new answers. Other assessments are unchanged. New replacement items are independently authored and pending editorial validation against the study guide.")}
        </div>
      ) : null}
      <section className="cafs22-shortcut">
        <div>
          <strong>{t("dash.v22.title", "NEW · Complete cross-chapter learning & refreshed fraud laws")}</strong>
          <p>
            {t("dash.v22.text1", "Connect all")} {ikData.rows.length} {t("dash.v22.text2", "topics, study the knowledge graph, and practise")} {ikData.questions.length}{" "}
            {t("dash.v22.text3", "integrated questions. The Fraud Laws section now uses your updated")} {kit.laws.length}-{t("dash.v22.text4", "law guide.")}
          </p>
        </div>
        <div className="cafs22-links">
          <PageButton page="integratedKnowledge" className="btn btn-primary btn-sm">
            {t("dash.v22.explore", "Explore")} {ikData.rows.length} {t("dash.v22.topics", "topics")}
          </PageButton>
          <PageButton page="laws" className="btn btn-sm">
            {t("dash.v22.laws", "Fraud Laws guide")}
          </PageButton>
        </div>
      </section>
      <AdaptiveDashboardCard />
      <QuickBar />
      <div className="hero v8-hero">
        <div className="v8-hero-content">
          <div className="v8-hero-badge">{t("dash.hero.badge", "FRAUD INTELLIGENCE · CERTIFICATION PREP")}</div>
          <h1>
            {t("dash.hero.line1", "Recognize fraud. Evaluate evidence.")}
            <br />
            <span>{t("dash.hero.line2", "Make defensible decisions.")}</span>
          </h1>
          <p>{t("dash.hero.text", "Move from fraud-risk governance to detection and analytics, then investigations. Train with structured revision, applied fraud mocks and targeted weakness reviews.")}</p>
          <div className="hero-buttons">
            <PageButton page="examPrep" className="btn btn-white">
              {t("dash.hero.revision", "Start adaptive fraud revision")}
            </PageButton>
            <PageButton page="memorize" className="btn btn-outline-white">
              {t("dash.hero.concepts", "Open fraud concepts")}
            </PageButton>
            <PageButton page="mocks" className="btn btn-outline-white">
              {t("dash.hero.centre", "Open fraud exam centre")}
            </PageButton>
          </div>
          <div className="v8-hero-foot">{t("dash.hero.foot", "✓ All learning tools work offline   ·   ✓ Your progress stays on this browser")}</div>
        </div>
        <div className="v8-hero-visual" aria-hidden="true">
          <div className="v8-glow"></div>
          <div className="v19confetti">
            {Array.from({ length: 18 }, (_, i) => (
              <i key={i} style={{ "--n": i + 1 } as CSSProperties} aria-hidden="true"></i>
            ))}
          </div>
          <div className="v8-achievement">
            <span className="v8-achievement-icon">★</span>
            <b>CAFS</b>
            <small>
              PREPARATION
              <br />
              IN PROGRESS
            </small>
          </div>
          <span className="v8-spark v8-spark-a">✦</span>
          <span className="v8-spark v8-spark-b">✧</span>
          <span className="v8-spark v8-spark-c">✦</span>
        </div>
      </div>
      <div className="v8-steps" aria-label="Recommended study sequence">
        {[
          ["memorize", "01", t("dash.step.learn", "LEARN"), t("dash.step.learnSub", "Memorisation & recall")],
          ["laws", "02", t("dash.step.reinforce", "REINFORCE"), t("dash.step.reinforceSub", "Laws & typologies")],
          ["chapters", "03", t("dash.step.practise", "PRACTISE"), t("dash.step.practiseSub", "Chapter assessments")],
          ["mocks", "04", t("dash.step.prove", "PROVE"), t("dash.step.proveSub", "Timed mixed mocks")],
          ["insights", "05", t("dash.step.improve", "IMPROVE"), t("dash.step.improveSub", "Review your weak topics")],
        ].map(([page, num, title, sub]) => (
          <button key={page} data-page={page} onClick={() => router.push(pageHref(page))}>
            <b>{num}</b>
            <span>
              <strong>{title}</strong>
              <small>{sub}</small>
            </span>
          </button>
        ))}
      </div>
      <div className="stats-grid">
        <StatCard title={t("dash.stat.placements", "Question placements")} num={total} detail={`${t("dash.stat.placementsAcross", "Across all")} ${exams.length} ${t("dash.stat.placementsExams", "core and advanced exams")}`} icon="book" />
        <StatCard title={t("dash.stat.completed", "Exams completed")} num={`${s.completed} / ${exams.length}`} detail={t("dash.stat.completedDetail", "Independent saved sessions")} icon="check" />
        <StatCard title={t("dash.stat.answered", "Questions answered")} num={`${s.answerCount} / ${total}`} detail={t("dash.stat.answeredDetail", "Across each exam")} icon="target" />
        <StatCard title={t("dash.stat.best", "Best completed score")} num={s.best === null ? "—" : s.best + "%"} detail={t("dash.stat.bestDetail", "Practice result · not official")} icon="award" />
      </div>
      <div className="section-heading">
        <div>
          <h2>{t("dash.choose.title", "Choose your fraud assessment")}</h2>
          <p>{t("dash.choose.sub", "Study one fraud domain, assess all three, or drill the concepts you missed.")}</p>
        </div>
      </div>
      <div className="section-tools">
        <div className="tabs" role="group" aria-label="Filter assessments">
          {[
            ["all", t("dash.tab.all", "All exams")],
            ["chapters", t("dash.tab.chapters", "Chapters")],
            ["mocks", t("dash.tab.mocks", "Full mocks")],
          ].map(([k, label]) => (
            <button key={k} className={`tab ${k === "all" ? "active" : ""}`} onClick={() => k !== "all" && router.push(pageHref(k))}>
              {label}
            </button>
          ))}
        </div>
        <div className="selector">
          <label htmlFor="timeSetting">{t("dash.timer.label", "New exam timer")}</label>
          <select id="timeSetting" aria-label="Select new exam timer" value={timer} onChange={(e) => setTimer(Number(e.target.value))}>
            {TIMERS.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="sets">
        {exams.map((e) => (
          <ExamCard key={e.id} exam={e} db={db} onOpen={openExam} />
        ))}
      </div>
      <div className="callout">
        <Icon name="info" />
        <div>
          <strong>{t("dash.callout1.title", "Independent, unofficial practice material.")}</strong>
          <p>
            {word} {perExam}-{t("dash.callout1.a", "question assessments with")} {total.toLocaleString("en-US")}{" "}
            {t("dash.callout1.b", "question placements. The exam sets are unofficial practice assessments. Some concepts recur in multiple exams; a high score on unfamiliar, timed questions is more informative than memorized answers. Multi-select answers require an exact match for credit. All content, answer keys and explanations are stored locally inside this HTML file; no internet connection is needed.")}
          </p>
        </div>
      </div>
      <div className="callout">
        <Icon name="book" />
        <div>
          <strong>
            {t("dash.callout2.title1", "Bonus:")} {bank.length} {t("dash.callout2.title2", "supplemental module questions for timed practice.")}
          </strong>
          <p>
            {t("dash.callout2.a", "Use the additional modules to practise more concepts and learn from answer explanations. Open")}{" "}
            <GoButton page="sprints">{t("dash.callout2.sprints", "Timed module drills")}</GoButton> {t("dash.callout2.b", "for 10–100 question assessments, or browse")}{" "}
            <GoButton page="library">{t("dash.callout2.library", "Question library")}</GoButton>{" "}
            {t("dash.callout2.c", "by topic. Supplemental practice is reported separately from the")} {exams.length} {t("dash.callout2.d", "core assessments.")}
          </p>
        </div>
      </div>
      <div className="backup-tools" style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 15 }}>
        <button className="btn btn-sm" onClick={downloadBackup}>
          <Icon name="download" /> {t("dash.backup.download", "Download progress backup")}
        </button>
        <button className="btn btn-sm" onClick={() => restoreRef.current?.click()}>
          <Icon name="refresh" /> {t("dash.backup.restore", "Restore saved progress")}
        </button>
        <input
          id="restoreInput"
          ref={restoreRef}
          type="file"
          accept=".json,application/json"
          hidden
          aria-label="Choose a progress backup file"
          onChange={async (e) => {
            const input = e.target;
            await restoreBackup(input.files?.[0], exams, () => router.push(pageHref("overview")));
            input.value = "";
          }}
        />
      </div>
      <LearningToolsPanel />
      <div className="sum13-shortcut">
        <strong>{t("examPrep.sum13.title", "Chapter Summaries")}</strong>
        <p>
          {topicCount} {t("examPrep.sum13.text", "structured revision topics across all three CAFS chapters. Review key concepts, examples and exam-focus points.")}
        </p>
        <GoButton page="chapterSummaries" className="btn btn-sm btn-primary">
          {t("examPrep.sum13.button", "Open chapter summaries")}
        </GoButton>
      </div>
      {dialog}
    </>
  );
}
