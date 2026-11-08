"use client";

import { ExamTile, LearningToolsPanel, PageButton, QuickBar, Triad } from "@/components/studio/dashboard/parts";
import { useOpenExam } from "@/components/studio/exam/useOpenExam";
import { useDb } from "@/lib/studio/db";
import { useStudioData, useT } from "@/lib/studio/StudioProvider";

export function ChaptersPage() {
  const t = useT();
  const { exams } = useStudioData();
  const [db] = useDb();
  const { openExam, dialog } = useOpenExam();

  return (
    <>
      <QuickBar />
      <div className="v17-revision-note">
        <strong>{t("chapters.note.title", "Domain 3 question-bank refresh")}</strong> ·{" "}
        {t("chapters.note.text", "The Fraud Investigations assessment has been rebuilt to remove 56 repeated items. If earlier Domain 3 progress is available in this browser storage or restored from backup, it is preserved under a legacy key so old selections are not scored against the revised questions. Other exam banks are unchanged.")}
      </div>
      <div className="v16-page-head">
        <div>
          <span className="v16-eyebrow">{t("chapters.eyebrow", "LEARN THE OFFICIAL DOMAINS")}</span>
          <h1>{t("chapters.title", "Fraud Domain Knowledge Assessments")}</h1>
          <p>{t("chapters.intro", "Domain-focused practice aligned to the three named courses in the uploaded CAFS Study Guide v1.03. Use these to find the concepts that need revision before taking a mixed fraud exam.")}</p>
          <div className="v16-actionline">
            <PageButton page="moduleHub" className="btn btn-primary">
              {t("chapters.hub", "Explore the domain learning hub →")}
            </PageButton>
            <PageButton page="chapterSummaries">{t("chapters.summaries", "Open study-guide summaries")}</PageButton>
          </div>
        </div>
      </div>
      <Triad kind="chapters" />
      <div className="v16-catalog-grid">
        {exams
          .filter((e) => e.type === "chapter")
          .map((e) => (
            <ExamTile key={e.id} exam={e} db={db} onOpen={openExam} />
          ))}
      </div>
      <LearningToolsPanel />
      {dialog}
    </>
  );
}
