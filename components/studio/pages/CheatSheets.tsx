"use client";

import { useState, type CSSProperties } from "react";
import { useBreadcrumb, useStudioData, useT } from "@/lib/studio/StudioProvider";

export function CheatSheetsPage() {
  const t = useT();
  const { studySheets } = useStudioData();
  const [sheetSel, setSheetSel] = useState("all");
  useBreadcrumb(t("cheatSheets.breadcrumb", "Executive Revision Briefs"));

  const sh = studySheets.find((s) => s.id === sheetSel) || studySheets[0];
  if (!sh) return null;
  const items: string[][] = sh.items || [];

  return (
    <div className="v9-view">
      <div className="v9-header">
        <div>
          <div className="coach-eyebrow">{t("cheatSheets.eyebrow", "EXECUTIVE REVISION BRIEFS")}</div>
          <h1>{t("cheatSheets.title", "Executive Revision Briefs")}</h1>
          <p>
            {t(
              "cheatSheets.intro",
              "One complete last-look overview plus a dedicated single-page reference for each exam domain. Use Print to save the selected sheet as a PDF or print it.",
            )}
          </p>
        </div>
        <button className="btn btn-primary" type="button" data-v9-print="1" onClick={() => window.print()}>
          {t("cheatSheets.print", "Print this sheet")}
        </button>
      </div>
      <div className="v9-toolbar">
        <div className="v9-tabs">
          {studySheets.map((s) => (
            <button type="button" key={s.id} className={`v9-tab ${s.id === sheetSel ? "is-active" : ""}`} data-v9-sheet={s.id} onClick={() => setSheetSel(s.id)}>
              {s.name}
            </button>
          ))}
        </div>
        <span className="v9-note">
          {items.length} {t("cheatSheets.note", "study points · curated from the supplied study materials")}
        </span>
      </div>
      <div className="v9-sheet" style={{ "--v9-accent": sh.accent } as CSSProperties}>
        <div className="v9-paper-top">
          <div>
            <div className="v9-paper-eyebrow">{t("cheatSheets.paper.eyebrow", "CAFS STUDY STUDIO · EXAM FOCUS")}</div>
            <h2>{sh.title}</h2>
            <p>{sh.subtitle}</p>
          </div>
          <div className="v9-paper-mark">{sh.id === "all" ? "40 / 30 / 30" : sh.name}</div>
        </div>
        <div className="v9-paper-grid">
          {items.map(([a, b], i) => (
            <div className="v9-point" key={i}>
              <span>{i + 1}</span>
              <div>
                <strong>{a}</strong>
                <p>{b}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="v9-sheet-footer">
          {t(
            "cheatSheets.footer",
            "Personal-study summary from supplied ACAMS CAFS Study Guide v1.03 and memorisation guides. Regional figures refer to the study-guide context; not live legal advice.",
          )}{" "}
          &nbsp; • &nbsp; {t("cheatSheets.footer2", "Recall the explanation, not just the label.")}
        </div>
      </div>
      <div className="v9-below">
        <strong>{t("cheatSheets.how.label", "How to revise:")}</strong>{" "}
        {t(
          "cheatSheets.how.text",
          "Read each point, cover the explanation and explain it aloud. Use the domain-specific sheets for detail, then test unfamiliar scenarios in the core mock exams.",
        )}
      </div>
    </div>
  );
}
