"use client";

import { useMemo, useState } from "react";
import { queryParam } from "@/components/studio/library/useQueryInit";
import { useBreadcrumb, useStudioData, useT } from "@/lib/studio/StudioProvider";
import { useStoredJSON } from "@/lib/studio/store";
import type { Rec } from "@/lib/studio/types";

const CASE_KEY = "cafs_study_studio_case_library_v12";
const NONE: Record<string, boolean> = {};
const CHAPTER_NAMES = ["", "Fraud Risk Management", "Fraud Detection & Analytics", "Fraud Investigations"];

const haystack = (c: Rec) => [c.title, c.topic, c.summary, c.signal, c.lesson, c.page].join(" ").toLowerCase();

/** Deep links: /studio/caseStudies?domain=2 or ?id=CS-08 (used by the hub and the adaptive path). */
export function CaseStudiesPage() {
  useBreadcrumb("Case Study Library");
  const t = useT();
  const { cases: CASES } = useStudioData();
  const [reviewed, setReviewed] = useStoredJSON<Record<string, boolean>>(CASE_KEY, NONE);
  const [init] = useState(() => {
    const id = queryParam("case") || queryParam("id");
    const c = CASES.find((x: Rec) => x.id === id);
    return { domain: c ? Number(c.chapter) : Number(queryParam("module") || queryParam("domain")) || 0, id: c ? id : "" };
  });
  const [domain, setDomain] = useState(init.domain);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState(init.id || CASES[0]?.id || "");

  const matches = (d: number, k: string, q: string) =>
    CASES.filter((c: Rec) => (!d || c.chapter === d) && (k === "all" || c.kind === k) && haystack(c).includes(q.toLowerCase()));
  const list = useMemo(
    () => matches(domain, category, query),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [CASES, domain, category, query],
  );
  const selected: Rec | undefined = list.find((x: Rec) => x.id === chosen) ?? list[0];
  const seen = CASES.filter((c: Rec) => reviewed[c.id]).length;
  const tabLabels = [
    t("caseStudies.tabAll", "All chapters"),
    t("caseStudies.tab1", "Chapter 1"),
    t("caseStudies.tab2", "Chapter 2"),
    t("caseStudies.tab3", "Chapter 3"),
  ];
  const count = (n: number) => CASES.filter((c: Rec) => c.chapter === n).length;

  return (
    <>
      <div className="cs-head">
        <div>
          <div className="eyebrow">{t("caseStudies.eyebrow", "ACAMS Study Guide · Exam-focused review")}</div>
          <h1>{t("caseStudies.title", "Case Study Library")}</h1>
          <p>
            {t(
              "caseStudies.intro",
              "Review the cases and decision scenarios from all three CAFS chapters. Each summary identifies what happened, the evidence or control issue, and the exam lesson. Test your recall before revealing the answer.",
            )}
          </p>
        </div>
        <div className="cs-statwrap">
          <div className="cs-stat">
            <b>{CASES.length}</b>
            <span>{t("caseStudies.statTotal", "Guide examples & scenarios")}</span>
          </div>
          <div className="cs-stat">
            <b>{seen}</b>
            <span>{t("caseStudies.statReviewed", "Marked reviewed")}</span>
          </div>
        </div>
      </div>
      <div className="cs-controls">
        <div className="cs-tabs" role="group" aria-label="Filter by chapter">
          {tabLabels.map((label, i) => (
            <button
              key={i}
              type="button"
              className="cs-tab"
              aria-pressed={domain === i}
              onClick={() => {
                setDomain(i);
                setQuery("");
                setChosen(matches(i, category, "")[0]?.id ?? chosen);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          className="text-input"
          id="csCategory"
          aria-label="Case category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setChosen(matches(domain, e.target.value, query)[0]?.id ?? chosen);
          }}
        >
          <option value="all">{t("caseStudies.fmtAll", "All formats")}</option>
          <option value="Example">{t("caseStudies.fmtExample", "Named case examples")}</option>
          <option value="Scenario">{t("caseStudies.fmtScenario", "Decision scenarios")}</option>
        </select>
        <input
          className="text-input cs-search"
          id="csSearch"
          type="search"
          placeholder={t("caseStudies.searchPlaceholder", "Search cases, controls, typologies…")}
          value={query}
          aria-label="Search case summaries"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <p className="cs-info">
        {list.length} matching cases · Chapter 1: {count(1)} · Chapter 2: {count(2)} · Chapter 3: {count(3)}.{" "}
        {t("caseStudies.disclaimer", "Scenario cases are illustrative exercises from the guide, not independently verified real events.")}
      </p>
      <div className="cs-main">
        <div className="cs-index" role="list" aria-label="Case index">
          {list.length ? (
            list.map((c: Rec, i: number) => (
              <button
                key={c.id}
                type="button"
                role="listitem"
                className={`cs-entry ${selected?.id === c.id ? "active" : ""}`}
                onClick={() => setChosen(c.id)}
              >
                <span className="cs-number">{String(i + 1).padStart(2, "0")}</span>
                <span className="cs-entry-main">
                  <b>{c.title}</b>
                  <small>
                    Ch {c.chapter} · {c.topic} · p. {c.page}
                  </small>
                </span>
                {reviewed[c.id] ? (
                  <span className="cs-done" title="Reviewed">
                    ✓
                  </span>
                ) : null}
              </button>
            ))
          ) : (
            <p className="cs-empty">{t("caseStudies.noMatch", "No cases match these filters. Try clearing your search.")}</p>
          )}
        </div>
        <section className="cs-detail" aria-label="Selected case study">
          {selected ? (
            <>
              <span className={`cs-domain d${selected.chapter}`}>
                CHAPTER {selected.chapter} · {CHAPTER_NAMES[selected.chapter]}
              </span>
              <h2>{selected.title}</h2>
              <div className="cs-meta">
                {selected.kind === "Scenario"
                  ? t("caseStudies.metaScenario", "Study-guide decision scenario")
                  : t("caseStudies.metaExample", "Study-guide case example")}{" "}
                · {selected.topic}
              </div>
              <div className="cs-card">
                <h3>{t("caseStudies.cardSummary", "Case summary")}</h3>
                <p>{selected.summary}</p>
              </div>
              <div className="cs-card">
                <h3>{t("caseStudies.cardSignal", "Key evidence / red flags / weakness")}</h3>
                <p>{selected.signal}</p>
              </div>
              <div className="cs-card cs-lesson">
                <h3>{t("caseStudies.cardLesson", "What to remember for the exam")}</h3>
                <p>{selected.lesson}</p>
              </div>
              <div className="cs-quiz">
                <h3>{t("caseStudies.quizTitle", "Test your recall")}</h3>
                <p>{selected.question}</p>
                <details key={selected.id}>
                  <summary>{t("caseStudies.reveal", "Reveal model answer")}</summary>
                  <p>{selected.answer}</p>
                </details>
              </div>
              <div className="cs-footer">
                <div className="cs-source">
                  Source: CAFS Study Guide · Chapter {selected.chapter} · printed p. {selected.page}. Summarized for personal study.
                </div>
                <button
                  type="button"
                  className={`btn btn-sm ${reviewed[selected.id] ? "btn-primary" : ""}`}
                  onClick={() => setReviewed((r) => ({ ...r, [selected.id]: !r[selected.id] }))}
                >
                  {reviewed[selected.id] ? t("caseStudies.reviewed", "✓ Reviewed") : t("caseStudies.markReviewed", "Mark reviewed")}
                </button>
              </div>
            </>
          ) : (
            <p className="cs-empty">{t("caseStudies.choose", "Choose a case to begin reviewing.")}</p>
          )}
        </section>
      </div>
    </>
  );
}
