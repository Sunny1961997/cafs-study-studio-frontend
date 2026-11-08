"use client";

import { useRouter } from "next/navigation";
import { AdaptiveDashboardCard } from "@/components/studio/adaptive/AdaptiveDashboardCard";
import { useState } from "react";
import { MOD_NAMES, ModuleTabs, NEW_EXAM_IDS, flagDomain, useAdvancedQuestions } from "@/components/studio/library/shared";
import { useBreadcrumb, useStudioData, useT } from "@/lib/studio/StudioProvider";
import { examHref, pageHref } from "@/lib/studio/nav";
import type { Rec } from "@/lib/studio/types";

export function ModuleHubPage() {
  useBreadcrumb("Fraud Domain Learning Hub");
  const t = useT();
  const router = useRouter();
  const { exams, redFlags: RED_FLAGS } = useStudioData();
  const { questions: ALL_QUESTIONS } = useAdvancedQuestions();
  const [n, setN] = useState(1);

  const MOCK_SETS = exams.filter((x) => x.type === "mock");
  const q = ALL_QUESTIONS.filter((x) => x.domain === n).length;
  const legacy = MOCK_SETS.filter((x) => !NEW_EXAM_IDS.includes(x.id)).reduce(
    (v, e) => v + e.questions.filter((x) => x.domain === n).length,
    0,
  );
  const f = RED_FLAGS.filter((x: Rec) => flagDomain(x) === n);
  const grouped = f.reduce<Record<string, Rec[]>>((a, x: Rec) => {
    (a[x.fraud_type] ??= []).push(x);
    return a;
  }, {});
  const groups = Object.values(grouped)
    .sort((a, b) => b.length - a.length)
    .slice(0, 5);
  const blurb =
    n === 1
      ? t("moduleHub.blurb1", "Governance, risk appetite, fraud typologies, prevention and response.")
      : n === 2
        ? t("moduleHub.blurb2", "Signals, behavior, data engineering, detection rules, model trade-offs and monitoring.")
        : t("moduleHub.blurb3", "Evidence, fraud schemes, interviewing, decision documentation, recovery and closure.");
  const advancedTotal = ALL_QUESTIONS.length;

  return (
    <>
      <AdaptiveDashboardCard />
      <div className="page-intro">
        <div className="eyebrow muted">{t("moduleHub.eyebrow", "One platform · Three CAFS modules")}</div>
        <h1>{t("moduleHub.title", "Fraud Domain Learning Hub")}</h1>
        <p>
          Keep all resources for each CAFS domain together: the study-guide summaries, case studies, {advancedTotal} advanced questions, full mocks and
          the fraud-indicator handbook.
        </p>
      </div>
      <ModuleTabs selected={n} onSelect={setN} />
      <div className={`v14-hero v16-domain-hero d${n}`}>
        <div className="eyebrow">DOMAIN 0{n}</div>
        <h2>{MOD_NAMES[n]}</h2>
        <p>{blurb}</p>
      </div>
      <div className="v14-metrics">
        <div className="v14-metric">
          <b>{100 + legacy + q}</b>
          <small>{t("moduleHub.metricAll", "All module exam questions")}</small>
        </div>
        <div className="v14-metric">
          <b>{q}</b>
          <small>{t("moduleHub.metricAdditional", "Additional mock questions")}</small>
        </div>
        <div className="v14-metric">
          <b>{f.length}</b>
          <small>{t("moduleHub.metricFlags", "Red flags / indicators")}</small>
        </div>
        <div className="v14-metric">
          <b>{MOCK_SETS.length}</b>
          <small>{t("moduleHub.metricMocks", "Full mock exam sets")}</small>
        </div>
      </div>
      <div className="v14-resourcegrid">
        <article className="v14-resource">
          <span className="v14-resource-icon">01</span>
          <h3>{t("moduleHub.r1Title", "Learn the chapter")}</h3>
          <p>{t("moduleHub.r1Text", "Study detailed chapter summaries and concept explanations, with saved revision status.")}</p>
          <div className="v14-actions">
            <button className="btn btn-primary btn-sm" onClick={() => router.push(`${pageHref("chapterSummaries")}?domain=${n}`)}>
              {t("moduleHub.r1Btn", "Open module summaries")}
            </button>
            <button className="btn btn-sm" onClick={() => router.push(examHref(`chapter-${n}`))}>
              {t("moduleHub.r1Btn2", "Core chapter assessment")}
            </button>
          </div>
        </article>
        <article className="v14-resource">
          <span className="v14-resource-icon">02</span>
          <h3>{t("moduleHub.r2Title", "Revise the fraud indicators")}</h3>
          <p>{f.length} indicators categorized by fraud type, warning class, fraud mechanism and source section.</p>
          <button className="btn btn-primary btn-sm" onClick={() => router.push(`${pageHref("redFlags")}?module=${n}`)}>
            Study {f.length} indicators
          </button>
        </article>
        <article className="v14-resource">
          <span className="v14-resource-icon">03</span>
          <h3>{t("moduleHub.r3Title", "Practise advanced questions")}</h3>
          <p>
            Filter the four newly imported mocks down to {q} questions for this domain. Immediate explanation checking does not affect formal scores.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => router.push(`${pageHref("advancedBank")}?module=${n}`)}>
            {t("moduleHub.r3Btn", "Open module question bank")}
          </button>
        </article>
        <article className="v14-resource">
          <span className="v14-resource-icon">04</span>
          <h3>{t("moduleHub.r4Title", "Review guide case studies")}</h3>
          <p>{t("moduleHub.r4Text", "Open the preserved case-study library, filtered to this chapter and its teaching cases.")}</p>
          <button className="btn btn-primary btn-sm" onClick={() => router.push(`${pageHref("caseStudies")}?domain=${n}`)}>
            {t("moduleHub.r4Btn", "Open module cases")}
          </button>
        </article>
      </div>
      <section className="v14-panel">
        <div className="v14-panelhead">
          <div>
            <h3>Full mock distribution · Module {n}</h3>
            <p>{t("moduleHub.distText", "These are the actual source questions imported into the native exam player.")}</p>
          </div>
          <button className="btn btn-sm" onClick={() => router.push(pageHref("mocks"))}>
            {t("moduleHub.viewMocks", "View all mocks")}
          </button>
        </div>
        <div className="v14-setlist">
          {MOCK_SETS.map((e) => (
            <div className="v14-setrow" key={e.id}>
              <div>
                <strong>{e.title}</strong>
                <div className="muted small">
                  {e.id === "mock-11" ? "Guide cases only" : NEW_EXAM_IDS.includes(e.id) ? "Advanced applied judgment" : "Original core mock"} ·{" "}
                  {e.questions.filter((x) => x.domain === n && x.kind === "multi").length} multi-select in this module
                </div>
              </div>
              <span>
                <b>{e.questions.filter((x) => x.domain === n).length}</b> questions
              </span>
              <button className="btn btn-sm" onClick={() => router.push(examHref(e.id))}>
                {t("moduleHub.openExam", "Open full exam")}
              </button>
            </div>
          ))}
        </div>
      </section>
      <section className="v14-panel">
        <div className="v14-panelhead">
          <h3>{t("moduleHub.leading", "Leading fraud-type categories")}</h3>
          <button className="btn btn-sm" onClick={() => router.push(`${pageHref("redFlags")}?module=${n}`)}>
            {t("moduleHub.browseAll", "Browse all")}
          </button>
        </div>
        <div className="v14-taglist">
          {groups.map((a) => (
            <span className="v14-tag" key={a[0].fraud_type}>
              {a[0].fraud_type} <b>{a.length}</b>
            </span>
          ))}
        </div>
      </section>
    </>
  );
}
