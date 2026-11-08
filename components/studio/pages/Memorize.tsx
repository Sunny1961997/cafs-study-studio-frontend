"use client";

import { useState } from "react";
import { KitFlow, KitStat, KitTop, useKit } from "@/components/studio/kit/KitFlow";
import { cx, lastPick, rememberPick } from "@/components/studio/kit/engine";
import { useT } from "@/lib/studio/StudioProvider";


function MemorizeHome() {
  const t = useT();
  const { data, mem, updateMem, startFlash, startQuiz } = useKit();
  const [memModule, setMemModuleState] = useState(lastPick.module);
  const [memChapter, setMemChapterState] = useState(lastPick.chapter);
  const setMemModule = (m: number) => {
    rememberPick(m, 1);
    setMemModuleState(m);
  };
  const setMemChapter = (c: number) => {
    rememberPick(memModule, c);
    setMemChapterState(c);
  };

  const moduleNames: Record<number, string> = {
    1: t("memorize.module1", "Fraud Risk Management"),
    2: t("memorize.module2", "Fraud Detection & Analytics"),
    3: t("memorize.module3", "Fraud Investigations"),
  };
  const chapters = data.chapters.filter((x) => x.module === memModule);
  const chapter = chapters.find((x) => x.chapter === memChapter) || chapters[0];
  if (!chapter) return null;
  const cards = data.flashcards.filter((x) => x.module === memModule && x.chapter === chapter.chapter);
  const nRated = cards.filter((x) => mem.ratings[x.id] === 2).length;
  const recall: string[] = chapter.recall;
  const setAll = (open: boolean) => document.querySelectorAll<HTMLDetailsElement>(".v6-recall-answer").forEach((n) => (n.open = open));

  return (
    <>
      <KitTop
        title={t("memorize.title", "Memorisation Kit")}
        desc={t("memorize.desc", "All key rules, illustrated answers and chapter flashcards are available here without opening another guide.")}
        breadcrumb="MEMORISATION KIT"
      />
      <div className="v5-tabs">
        {[1, 2, 3].map((m) => (
          <button
            key={m}
            className={cx("v5-tab", memModule === m && "active")}
            onClick={() => {
              setMemModule(m);
              setMemChapter(1);
            }}
          >
            Module {m}: {moduleNames[m]}
          </button>
        ))}
      </div>
      <div className="v5-chapters">
        {chapters.map((c) => (
          <button key={c.id} className={cx("v5-chapter", chapter.chapter === c.chapter && "active")} onClick={() => setMemChapter(c.chapter)}>
            <small>CHAPTER {c.chapter}</small>
            <strong>{c.title}</strong>
            <span>{data.flashcards.filter((f) => f.module === c.module && f.chapter === c.chapter).length} flashcards</span>
          </button>
        ))}
      </div>
      <div className="v5-memorize-grid" key={chapter.id}>
        <article className="v5-panel">
          <div className="v5-kicker">
            MODULE {memModule} · CHAPTER {chapter.chapter}
          </div>
          <h2>{chapter.title}</h2>
          <p className="v5-def">{chapter.goal}</p>
          <div className="v5-memory-note">
            <b>{t("memorize.remember", "Remember this sequence")}</b>
            <p>{chapter.memory}</p>
          </div>
          <h3>{t("memorize.essentialRules", "Essential rules")}</h3>
          <ol className="v5-rules">
            {chapter.points.map((p: string, i: number) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
          <div className="v6-study-section">
            <h3>{t("memorize.studyNotes", "Study notes at a glance")}</h3>
            {chapter.overviewSections.map((s: { heading: string; text: string }, i: number) => (
              <details key={i} className="v6-mini-note" open={i === 0}>
                <summary>
                  {s.heading} · Part {i + 1}
                </summary>
                <p>{s.text}</p>
              </details>
            ))}
          </div>
        </article>
        <aside className="v5-panel">
          <h3>{t("memorize.studyTools", "Chapter study tools")}</h3>
          <KitStat value={cards.length} label={t("memorize.detailedFlashcards", "Detailed flashcards")} />
          <p className="v5-hint">{nRated} of {cards.length} cards marked mastered on this browser.</p>
          <button className="btn btn-primary v5-wide" onClick={() => startFlash("memory", null, memModule, chapter.chapter)}>
            {t("memorize.studyChapterFlashcards", "Study chapter flashcards")}
          </button>{" "}
          <button className="btn v5-wide" onClick={() => startQuiz("memory", 12, memModule, chapter.chapter)}>
            {t("memorize.chapterChallenge", "12-question chapter challenge")}
          </button>
          <h3>{t("memorize.highYield", "High-yield comparisons")}</h3>
          <p className="v5-hint">{chapter.focus}</p>
        </aside>
      </div>
      <section className="v5-panel" style={{ marginTop: 16 }} key={`recall-${chapter.id}`}>
        <div className="v6-recall-header">
          <div>
            <h3>
              {t("memorize.recallTitle", "Cover & Recall · Think, explain, master")} <small>({recall.length})</small>
            </h3>
            <p className="v5-hint">
              {t(
                "memorize.recallHint",
                "Each question has a full model answer. Answer aloud first, check the reasoning and mark mastered only when you can repeat it without help.",
              )}
            </p>
          </div>
          <div className="v5-actions">
            <button className="btn btn-sm" onClick={() => setAll(true)}>
              {t("memorize.revealAll", "Reveal all")}
            </button>
            <button className="btn btn-sm" onClick={() => setAll(false)}>
              {t("memorize.collapseAll", "Collapse all")}
            </button>
          </div>
        </div>
        <div className="v6-recalls">
          {recall.map((q, i) => (
            <article key={i} className="v6-recall">
              <div className="v6-recall-top">
                <span className="v6-number">{i + 1}</span>
                <div className="v6-recall-body">
                  <strong>{q}</strong>
                  <details className="v6-recall-answer">
                    <summary>{t("memorize.revealAnswer", "Reveal model answer and explanation")}</summary>
                    <p>{chapter.recallAnswers[i]}</p>
                    <span className="v6-source-line">
                      CAFS Study Guide · Module {chapter.module} · {chapter.title}
                    </span>
                  </details>
                </div>
              </div>
              <label className="v6-recall-check">
                <input
                  type="checkbox"
                  checked={!!mem.recall[`${chapter.id}-${i}`]}
                  onChange={(e) =>
                    updateMem((m) => {
                      m.recall[`${chapter.id}-${i}`] = e.target.checked;
                    })
                  }
                />
                <span>{t("memorize.canExplain", "I can explain this")}</span>
              </label>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

export function MemorizePage() {
  return (
    <KitFlow home="memorize">
      <MemorizeHome />
    </KitFlow>
  );
}
