"use client";

import { useState } from "react";
import { queryParam } from "@/components/studio/library/useQueryInit";
import { useBreadcrumb, useStudioData, useT } from "@/lib/studio/StudioProvider";
import { useStoredJSON } from "@/lib/studio/store";
import type { Rec } from "@/lib/studio/types";

const KEY = "cafs_studio_v13_summary_reviewed";
const NONE: Record<string, boolean> = {};

function Note({ b }: { b: Rec }) {
  if (b.kind === "table") {
    return (
      <div className="sum13-tablewrap">
        <table className="sum13-table">
          <tbody>
            {(b.rows as string[][]).map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return <div className={`sum13-note ${b.kind === "bullet" ? "bullet" : b.kind === "h" ? "h" : ""}`}>{b.text}</div>;
}

/** Deep links: /studio/chapterSummaries?domain=2 or ?id=SUM-2-004. */
export function ChapterSummariesPage() {
  useBreadcrumb("Chapter Summaries");
  const t = useT();
  const { summaries: SUMS } = useStudioData();
  const [reviewed, setReviewed] = useStoredJSON<Record<string, boolean>>(KEY, NONE);
  const all: Rec[] = SUMS.flatMap((d: Rec) => d.topics as Rec[]);
  const [init] = useState(() => {
    const id = queryParam("open") || queryParam("id");
    const hit = all.find((x) => x.id === id);
    return { domain: hit ? Number(id.split("-")[1]) : Number(queryParam("module") || queryParam("domain")) || 1, id: hit ? id : "" };
  });
  const [domain, setDomain] = useState(init.domain);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState(init.id);

  const current: Rec = SUMS.find((d: Rec) => d.chapter === domain) ?? SUMS[0];
  if (!current) return null;
  const topicsOf = (c: Rec, st: string, kw: string): Rec[] =>
    (c.topics as Rec[]).filter((tp) => {
      if (st === "reviewed" && !reviewed[tp.id]) return false;
      if (st === "unreviewed" && reviewed[tp.id]) return false;
      if (kw.trim()) {
        const s = kw.trim().toLowerCase();
        return (
          [tp.title, tp.summary, ...tp.focus].join(" ").toLowerCase().includes(s) ||
          (tp.blocks as Rec[]).some((b) => (b.text || "").toLowerCase().includes(s))
        );
      }
      return true;
    });
  const list = topicsOf(current, status, keyword);
  const tp: Rec | undefined = list.find((x) => x.id === selected) ?? list[0];
  const totalSeen = all.filter((x) => reviewed[x.id]).length;
  const chapterSeen = (current.topics as Rec[]).filter((x) => reviewed[x.id]).length;
  const pos = tp ? (current.topics as Rec[]).indexOf(tp) + 1 : 0;

  const step = (dir: number) => {
    const i = list.findIndex((x) => x.id === tp?.id);
    const j = Math.max(0, Math.min(list.length - 1, i + dir));
    if (list[j]) setSelected(list[j].id);
  };

  return (
    <>
      <header className="sum13-head">
        <div>
          <div className="sum13-kicker">{t("chapterSummaries.kicker", "Learn & Revise · Structured Study Notes")}</div>
          <h1>{t("chapterSummaries.title", "Chapter Summaries")}</h1>
          <p>
            {t(
              "chapterSummaries.intro",
              "Review the chapter summaries by topic, then test what you can explain without notes. Each topic preserves the terminology, study details and exam-focus points from your three supplied chapter summaries. All content is available offline.",
            )}
          </p>
        </div>
        <div className="sum13-headStats">
          <div className="sum13-stat">
            <b>{all.length}</b>
            <small>{t("chapterSummaries.statTopics", "Topics in library")}</small>
          </div>
          <div className="sum13-stat">
            <b>{totalSeen}</b>
            <small>{t("chapterSummaries.statRevised", "Topics revised")}</small>
          </div>
        </div>
      </header>
      <div className="sum13-tabs" role="tablist" aria-label="Summary chapter">
        {SUMS.map((d: Rec) => (
          <button
            key={d.chapter}
            type="button"
            className="sum13-tab"
            role="tab"
            aria-selected={domain === d.chapter}
            onClick={() => {
              setDomain(d.chapter);
              setKeyword("");
              setStatus("all");
              setSelected(d.topics[0]?.id || "");
            }}
          >
            Chapter {d.chapter} · {d.title}
          </button>
        ))}
      </div>
      <div className="sum13-toolbar">
        <input
          id="sum13-search"
          type="search"
          className="text-input sum13-search"
          placeholder={t("chapterSummaries.searchPlaceholder", "Search concepts, frameworks, laws, case names…")}
          aria-label="Search chapter summaries"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setSelected(topicsOf(current, status, e.target.value)[0]?.id || "");
          }}
        />
        <select
          className="sum13-filter"
          id="sum13-status"
          aria-label="Revision status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setSelected(topicsOf(current, e.target.value, keyword)[0]?.id || "");
          }}
        >
          <option value="all">{t("chapterSummaries.statusAll", "All topics")}</option>
          <option value="unreviewed">{t("chapterSummaries.statusUnreviewed", "Not yet revised")}</option>
          <option value="reviewed">{t("chapterSummaries.statusReviewed", "Already revised")}</option>
        </select>
        <span className="muted small">
          {list.length} topics shown · {chapterSeen}/{current.topics.length} revised
        </span>
      </div>
      <div className="sum13-main">
        <nav className="sum13-index" aria-label="Chapter summary topic index">
          {list.length ? (
            list.map((item) => (
              <button key={item.id} type="button" className={tp?.id === item.id ? "active" : ""} onClick={() => setSelected(item.id)}>
                <span className="sum13-n">{String((current.topics as Rec[]).indexOf(item) + 1).padStart(2, "0")}</span>
                <span className="sum13-idx-title">{item.title}</span>
                {reviewed[item.id] ? (
                  <span className="sum13-check" title="Revised">
                    ✓
                  </span>
                ) : null}
              </button>
            ))
          ) : (
            <p className="sum13-empty">
              {t("chapterSummaries.noMatch", "No topics match this filter. Clear the search or switch your revision status.")}
            </p>
          )}
        </nav>
        <article className="sum13-pane">
          {tp ? (
            <>
              <span className={`sum13-domain d${domain}`}>
                CHAPTER {domain} · TOPIC {pos} OF {current.topics.length}
              </span>
              <h2>{tp.title}</h2>
              <p className="sum13-intro">{tp.summary}</p>
              {tp.focus.length ? (
                <div className="sum13-focus">
                  <strong>{t("chapterSummaries.focusTitle", "Exam-focus points")}</strong>
                  <ul>
                    {(tp.focus as string[]).map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <details className="sum13-notes" open key={tp.id}>
                <summary>{t("chapterSummaries.notesSummary", "Complete summary notes and details")}</summary>
                {(tp.blocks as Rec[]).slice(1).map((b, i) => (
                  <Note key={i} b={b} />
                ))}
              </details>
              <div className="sum13-actions">
                <button
                  type="button"
                  className={`btn btn-sm ${reviewed[tp.id] ? "btn-primary" : ""}`}
                  onClick={() => setReviewed((r) => ({ ...r, [tp.id]: !r[tp.id] }))}
                >
                  {reviewed[tp.id] ? t("chapterSummaries.revised", "✓ Revised") : t("chapterSummaries.markRevised", "Mark topic revised")}
                </button>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  <button className="btn btn-sm" type="button" onClick={() => step(-1)}>
                    {t("chapterSummaries.prev", "Previous topic")}
                  </button>
                  <button className="btn btn-sm" type="button" onClick={() => step(1)}>
                    {t("chapterSummaries.next", "Next topic")}
                  </button>
                </div>
              </div>
              <p className="sum13-hint">
                {t(
                  "chapterSummaries.hint",
                  "Active recall: explain the topic in your own words before reading the complete notes. Marking a topic revised records your progress, not a graded exam score.",
                )}
              </p>
            </>
          ) : (
            <p className="sum13-empty">{t("chapterSummaries.choose", "Select or search for a topic to begin.")}</p>
          )}
        </article>
      </div>
    </>
  );
}
