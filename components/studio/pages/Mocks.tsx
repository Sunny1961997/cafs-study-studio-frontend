"use client";

import { useState } from "react";
import { ExamTile, LearningToolsPanel, PageButton, QuickBar, Triad } from "@/components/studio/dashboard/parts";
import { useOpenExam } from "@/components/studio/exam/useOpenExam";
import { useDb } from "@/lib/studio/db";
import { useStudioData, useT } from "@/lib/studio/StudioProvider";

export function MocksPage() {
  const t = useT();
  const { exams } = useStudioData();
  const [db] = useDb();
  const { openExam, dialog } = useOpenExam();
  const [track, setTrack] = useState("all");
  const [find, setFind] = useState("");

  const mocks = exams.filter((e) => e.type === "mock");
  const completed = mocks.filter((e) => db.sessions[e.id]?.submitted).length;
  const next = mocks.find((x) => !db.sessions[x.id]?.submitted) || mocks[0];
  const trackCount = (k: string) => mocks.filter((e) => e.track === k).length;
  const q = find.toLowerCase().trim();
  const rows = mocks.filter((e) => (track === "all" || e.track === track) && (!q || (e.title + " " + e.description + " " + e.short).toLowerCase().includes(q)));
  const total = exams.reduce((n, e) => n + e.questions.length, 0);

  return (
    <>
      <QuickBar />
      <div className="v16-page-head">
        <div>
          <span className="v16-eyebrow">{t("mocks.eyebrow", "SIMULATION & APPLICATION")}</span>
          <h1>{t("mocks.title", "Fraud Mock Examination Centre")}</h1>
          <p>{t("mocks.intro", "Choose a fraud-focused assessment. Work through real decisions across risk management, detection analytics and investigations. Answers and rationales stay hidden until submission.")}</p>
          <div className="v16-actionline">
            {next ? (
              <button className="btn btn-primary" onClick={() => openExam(next.id)}>
                {t("mocks.next", "Start the next fraud mock →")}
              </button>
            ) : null}
            <PageButton page="adaptivePath">{t("mocks.weak", "Review my weak fraud topics")}</PageButton>
          </div>
        </div>
        <div className="v16-head-score">
          <b>
            {completed}
            <span> / {mocks.length}</span>
          </b>
          <small>{t("mocks.completed", "Full assessments completed")}</small>
          <div className="v16-mini-progress">
            <i style={{ width: `${mocks.length ? (completed / mocks.length) * 100 : 0}%` }}></i>
          </div>
        </div>
      </div>
      <Triad kind="mocks" />
      <div className="v16-examtools">
        <div>
          <label htmlFor="v16Track">{t("mocks.series", "Mock series")}</label>
          <select id="v16Track" value={track} onChange={(e) => setTrack(e.target.value)}>
            <option value="all">
              {t("mocks.opt.all", "All fraud assessments")} ({mocks.length})
            </option>
            <option value="integrated">
              {t("mocks.opt.integrated", "Integrated foundations")} ({trackCount("integrated")})
            </option>
            <option value="advanced">
              {t("mocks.opt.advanced", "Advanced application")} ({trackCount("advanced")})
            </option>
            <option value="cases">
              {t("mocks.opt.cases", "Study-guide cases")} ({trackCount("cases")})
            </option>
          </select>
        </div>
        <div>
          <label htmlFor="v16Find">{t("mocks.search", "Search exam titles")}</label>
          <input id="v16Find" placeholder="e.g. evidence, detection, cases" aria-label="Search fraud mocks" value={find} onChange={(e) => setFind(e.target.value)} />
        </div>
        <div className="v16-examnote">{t("mocks.note", "✓ Timed or untimed   ✓ Multi-select   ✓ Explanations after submission")}</div>
      </div>
      <div className="v16-catalog-grid" id="v16Catalog">
        {rows.length ? rows.map((e) => <ExamTile key={e.id} exam={e} db={db} onOpen={openExam} />) : <div className="empty">{t("mocks.empty", "No fraud exams match. Clear your search or choose All assessments.")}</div>}
      </div>
      <details className="v16-quality-panel">
        <summary>{t("mocks.quality.summary", "Question-bank quality and source notes")}</summary>
        <p>
          {t("mocks.quality.a", "Structural validation checked all")} {total.toLocaleString("en-US")}{" "}
          {t("mocks.quality.b", "items for answer-key bounds, option uniqueness, question-type consistency and named guide sections, with no structural exceptions identified. This automated check is not a line-by-line verification of subject-matter accuracy. Existing editorial metadata includes 570 items marked for further review (264 retained provisional, 250 existing editorial-QA items, and 56 newly rewritten Domain 3 items), 400 imported practice questions, and 30 pilot-reviewed items. Some explanations remain brief, so use the study guide as the primary authority when reviewing uncertain answers.")}
        </p>
      </details>
      <p className="v16-disclaimer">
        {t("mocks.disclaimer", "These are independently developed CAFS practice questions based on study-guide concepts, not an ACAMS exam simulator or official examination. The case-edition distribution intentionally differs from the standard mixed-domain weighting. Some existing sets are marked provisional for editorial quality review.")}
      </p>
      <LearningToolsPanel />
      {dialog}
    </>
  );
}
