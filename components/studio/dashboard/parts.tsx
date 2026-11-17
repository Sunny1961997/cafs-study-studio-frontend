"use client";

// Building blocks of the Overview / Mocks / Chapters pages (examCard, v16ExamTile, the "ONE STUDIO"
// quick bar, the "Learn, practise and recall" panel and the domain triad).

import { useRouter } from "next/navigation";
import { Icon } from "@/lib/studio/Icon";
import { TITLES, doneCount } from "@/lib/studio/engine";
import { pageHref } from "@/lib/studio/nav";
import { useStudioData, useT } from "@/lib/studio/StudioProvider";
import type { Db, Exam } from "@/lib/studio/types";

/** Navigates to a studio page (the original `data-page` buttons). */
export function PageButton({ page, className = "btn", children }: { page: string; className?: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <button className={className} data-page={page} onClick={() => router.push(pageHref(page))}>
      {children}
    </button>
  );
}

/** v14 "ONE STUDIO" quick bar, injected on Overview, Mocks and Chapters. */
export function QuickBar() {
  const t = useT();
  const { exams, redFlags } = useStudioData();
  const added = exams.filter((e) => e.type === "mock" && e.track !== "integrated").reduce((n, e) => n + e.questions.length, 0);
  return (
    <section className="v14-quickbar">
      <div>
        <strong>{t("dash.quick.title", "ONE STUDIO · All fraud learning resources organized by CAFS domain")}</strong>
        <p>
          {added} {t("dash.quick.added", "added mock questions")} · {redFlags.length} {t("dash.quick.indicators", "fraud indicators")} · {t("dash.quick.existing", "existing chapter summaries and case studies.")}
        </p>
      </div>
      <div className="v14-actions">
        <PageButton page="moduleHub" className="btn btn-primary btn-sm">
          {t("dash.quick.hub", "Explore Fraud Domains")}
        </PageButton>
        <PageButton page="redFlags" className="btn btn-sm">
          {t("dash.quick.redFlags", "Fraud Red Flags")}
        </PageButton>
        <PageButton page="advancedBank" className="btn btn-sm">
          {t("dash.quick.advanced", "Advanced Fraud Questions")}
        </PageButton>
      </div>
    </section>
  );
}

/** v5 panel at the end of the dashboard pages (labels of the later v-scripts). */
export function LearningToolsPanel() {
  const t = useT();
  const { kit } = useStudioData();
  const recall = kit.chapters.reduce((n, x) => n + (Array.isArray(x.recall) ? x.recall.length : 0), 0);
  const router = useRouter();
  return (
    <div className="v5-panel" style={{ marginTop: 18 }}>
      <div className="v5-kicker">{t("dash.tools.kicker", "YOUR LEARNING TOOLS")}</div>
      <h2>{t("dash.tools.title", "Learn, practise and recall")}</h2>
      <p className="v5-hint">{t("dash.tools.hint", "Start with recall and topic practice, then use the full mocks to check what you can apply independently.")}</p>
      <div className="v5-hubcards">
        <button data-page="laws" onClick={() => router.push(pageHref("laws"))}>
          <strong>{t("dash.tools.laws", "Fraud Laws")}</strong>
          <span>
            {kit.laws.length} {t("dash.tools.lawsDetail", "laws · flashcards and mocks")}
          </span>
        </button>
        <button data-page="typologies" onClick={() => router.push(pageHref("typologies"))}>
          <strong>{t("dash.tools.typologies", "Fraud Classifications")}</strong>
          <span>
            {kit.typologies.length} {t("dash.tools.typologiesDetail", "concepts · flashcards and mocks")}
          </span>
        </button>
        <button data-page="memorize" onClick={() => router.push(pageHref("memorize"))}>
          <strong>{t("dash.tools.memorize", "Chapter Memorisation Kits")}</strong>
          <span>
            {kit.chapters.length} {t("dash.tools.subchapters", "subchapters")} · {kit.flashcards.length} {t("dash.tools.flashcards", "flashcards")} · {recall} {t("dash.tools.recall", "recall prompts")}
          </span>
        </button>
      </div>
    </div>
  );
}

/** Three domain cards (v16-triad). `labelKey` differs between the Mocks and Chapters pages. */
export function Triad({ kind }: { kind: "mocks" | "chapters" }) {
  const t = useT();
  const mix = [40, 30, 30];
  return (
    <div className="v16-triad">
      {[1, 2, 3].map((d, i) => (
        <div className={`v16-triad-card d${d}`} key={d}>
          <small>{kind === "mocks" ? `${t("dash.triad.official", "OFFICIAL CAFS DOMAIN")} 0${d}` : `${t("dash.triad.domain", "DOMAIN")} ${d}`}</small>
          <b>{TITLES[d]}</b>
          <span>
            {mix[i]}% {kind === "mocks" ? t("dash.triad.mocksMix", "of the standard mixed mock blueprint") : t("dash.triad.chaptersMix", "in the mixed mock blueprint")}
          </span>
        </div>
      ))}
    </div>
  );
}

/** v16 catalog tile (Mocks and Chapters pages). */
export function ExamTile({ exam: e, db, onOpen }: { exam: Exam; db: Db; onOpen: (id: string) => void }) {
  const t = useT();
  const x = db.sessions[e.id];
  const n = doneCount(e, x);
  const submitted = !!x?.submitted;
  const multi = e.questions.filter((q) => q.kind === "multi").length;
  const tf = e.questions.filter((q) => q.kind === "truefalse").length;
  const tag = e.track === "cases" ? "CASE STUDY" : e.track === "advanced" ? "EXTREME CHALLENGE" : e.track === "integrated" ? "INTEGRATED FRAUD" : "DOMAIN REVIEW";
  return (
    <article className={`v16-tile v16-track-${e.track}`}>
      <div className="v16-tile-row">
        <span className="v16-label">{tag}</span>
        <span className={`v16-state ${submitted ? "completed" : n ? "ongoing" : ""}`}>{submitted ? "Completed" : n ? "In progress" : "Ready"}</span>
      </div>
      <div className="v16-catalog-id">{e.type === "chapter" ? "DOMAIN " + e.chapter : "PRACTICE EXAM · " + e.short}</div>
      <h3>{e.title}</h3>
      <p>{e.description}</p>
      <div className="v16-pills">
        <span>{e.questions.length} questions</span>
        <span>{multi} multi-select</span>
        {tf ? <span>{tf} True/False</span> : null}
        <span>{e.type === "chapter" ? "Single domain" : e.track === "cases" ? "28 / 45 / 27" : "40 / 30 / 30"} mix</span>
      </div>
      <div className="v16-tile-end">
        <div>
          <div className="v16-meter">
            <i style={{ width: `${n}%` }}></i>
          </div>
          <small>
            {submitted ? (
              <>
                Latest score <b>{x?.score}%</b>
              </>
            ) : n ? (
              `${n} answered · progress saved`
            ) : (
              "Not yet attempted"
            )}
          </small>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => onOpen(e.id)}>
          {submitted ? t("dash.tile.report", "View report") : n ? t("dash.tile.continue", "Continue") : t("dash.tile.open", "Open exam")} →
        </button>
      </div>
    </article>
  );
}

/** Overview exam card (examCard). */
export function ExamCard({ exam: e, db, onOpen }: { exam: Exam; db: Db; onOpen: (id: string) => void }) {
  const t = useT();
  const s = db.sessions[e.id];
  const count = doneCount(e, s);
  const numMulti = e.questions.filter((q) => q.kind === "multi").length;
  const status = s?.submitted ? "Completed" : s ? "In progress" : "Not started";
  const tagclass = s?.submitted ? "done" : s ? "progressing" : "";
  const distributions = e.type === "chapter" ? `Domain ${e.chapter} only` : e.distribution.join(" / ") + " domain split";
  return (
    <article className={`exam-card ${e.type}`}>
      <div className="exam-card-top">
        <div className="exam-card-mark">{e.type === "chapter" ? String(e.chapter).padStart(2, "0") : "M" + e.id.split("-")[1]}</div>
        <span className={`tag ${tagclass}`}>{status}</span>
      </div>
      <h3>{e.title}</h3>
      <p>{e.subtitle}</p>
      <div className="exam-card-detail">
        <span>
          <Icon name="book" /> {e.questions.length} questions
        </span>{" "}
        <span>· {numMulti} multi-select</span>
      </div>
      <div className="exam-card-detail" style={{ margin: "0 0 14px" }}>
        <Icon name="target" /> {distributions}
      </div>
      <div className="card-meter">
        <b style={{ width: `${count}%` }}></b>
      </div>
      <div className="card-bottom">
        <div className="card-score">
          <strong>{s?.submitted ? "Score: " + s.score + "/100" : count + "% answered"}</strong>
          <span>{s?.submitted ? t("dash.card.review", "Review available") : s ? t("dash.card.saved", "Progress saved") : t("dash.card.ready", "Ready to begin")}</span>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => onOpen(e.id)}>
          {s?.submitted ? t("dash.card.results", "See results") : s ? t("dash.card.resume", "Resume exam") : t("dash.card.start", "Start exam")} <Icon name="right" />
        </button>
      </div>
    </article>
  );
}
