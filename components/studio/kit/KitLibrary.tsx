"use client";

// Searchable list + detail library of the kit (typology atlas; the same markup the original used for laws).

import { useState } from "react";
import { KitStat, KitTop, useKit } from "@/components/studio/kit/KitFlow";
import { cx, getList } from "@/components/studio/kit/engine";
import { useT } from "@/lib/studio/StudioProvider";

export function KitLibrary({ kind }: { kind: "laws" | "typologies" }) {
  const t = useT();
  const { data, mem, startFlash, startQuiz } = useKit();
  const [cat, setCat] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const law = kind === "laws";
  const all = getList(data, kind);
  const catOf = (x: { jurisdiction?: string; category?: string }) => (law ? x.jurisdiction : x.category);
  const needle = search.toLowerCase();
  const list = all.filter((x) => (cat === "all" || catOf(x) === cat) && (!search || [x.term, x.definition, x.note || ""].join(" ").toLowerCase().includes(needle)));
  const item = list.find((x) => x.id === selected) || list[0];
  const cats = ["all", ...new Set(all.map((x) => catOf(x) as string))];
  const know = all.filter((x) => mem.ratings[x.id] === 2).length;
  const mocks = mem.quizzes.filter((q) => q.type === kind).length;

  return (
    <>
      {law ? (
        <KitTop
          title={t("kit.lawsTitle", "Fraud Laws & Regulations")}
          desc={t("kit.lawsDesc", "Explore the 19 laws in your supplied study summary, compare jurisdictions, then test yourself with dedicated law mocks.")}
          breadcrumb="LAW LIBRARY"
        />
      ) : (
        <KitTop
          title={t("typologies.title", "Fraud Classifications & Typologies")}
          desc={t("typologies.desc", "Recognize fraud party classifications, scheme families, associated enabling techniques and common exam traps.")}
          breadcrumb="TYPOLOGY ATLAS"
        />
      )}
      <div className="v5-note">
        {law
          ? t("kit.lawsNote", "These summaries are for studying the CAFS guide, not for deciding live regulatory obligations.")
          : t("typologies.note", "Classify who commits the fraud separately from the method used. Remember that red flags require assessment, not automatic conclusions.")}
      </div>
      <div className="v5-stats">
        <KitStat value={all.length} label={law ? t("kit.statLaws", "Laws in library") : t("typologies.statConcepts", "Concepts in library")} />
        <KitStat value={know} label={t("typologies.statMastered", "Flashcards mastered")} />
        <KitStat value={mocks} label={t("typologies.statMocks", "Completed mini-mocks")} />
      </div>
      <div className="v5-actions">
        <button className="btn btn-primary" onClick={() => startFlash(kind)}>
          {t("typologies.studyFlashcards", "Study flashcards")}
        </button>
        <button className="btn" onClick={() => startQuiz(kind, 20)}>
          {t("typologies.mock20", "Start 20-question mock")}
        </button>
        <button className="btn" onClick={() => startQuiz(kind, 40)}>
          {t("typologies.mock40", "Start 40-question mock")}
        </button>
      </div>
      <div className="v5-searchbar">
        <input
          className="text-input"
          id="v5Search"
          placeholder={t("typologies.searchPlaceholder", "Search by name, rule or concept")}
          value={search}
          aria-label="Search concepts"
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          id="v5Category"
          aria-label="Filter topics"
          value={cat}
          onChange={(e) => {
            setCat(e.target.value);
            setSelected(null);
          }}
        >
          {cats.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? t("typologies.allCategories", "All categories") : c}
            </option>
          ))}
        </select>
      </div>
      <div className="v5-library">
        <section className="v5-list">
          {list.length ? (
            list.map((x) => (
              <button key={x.id} className={cx("v5-listrow", item?.id === x.id && "selected")} onClick={() => setSelected(x.id)}>
                <span>
                  <b>{x.term}</b>
                  <small>
                    {catOf(x)} · {x.priority}
                  </small>
                </span>
                <span aria-hidden="true">›</span>
              </button>
            ))
          ) : (
            <div className="empty">{t("typologies.noMatch", "No matching entry. Try another search.")}</div>
          )}
        </section>
        <article className="v5-detail">
          {item && (
            <>
              <div className="v5-kicker">
                {catOf(item)} · {item.priority}
              </div>
              <h2>{item.term}</h2>
              <p className="v5-def">{item.definition}</p>
              {item.study?.context && (
                <div className="v6-source-more">
                  <h3>{t("typologies.understand", "What you need to understand")}</h3>
                  <p>{item.study.context}</p>
                </div>
              )}
              {item.study?.example && (
                <div className="v6-source-more">
                  <h3>{t("typologies.scenarioClue", "Scenario clue")}</h3>
                  <p>{item.study.example}</p>
                </div>
              )}
              {item.study?.distinction && (
                <div className="v5-memory-note">
                  <b>{t("typologies.examDistinction", "Exam distinction")}</b>
                  <p>{item.study.distinction}</p>
                </div>
              )}
              <div className="v5-source">Study reference: {item.source}</div>
              <div className="v5-actions">
                <button className="btn btn-primary" onClick={() => startFlash(kind, item.id)}>
                  {t("typologies.oneFlashcard", "Flashcard for this concept")}
                </button>
              </div>
            </>
          )}
        </article>
      </div>
    </>
  );
}
