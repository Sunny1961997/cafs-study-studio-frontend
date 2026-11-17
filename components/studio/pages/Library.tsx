"use client";

import { useMemo, useRef, useState } from "react";
import { Icon } from "@/lib/studio/Icon";
import { useStudioData, useT } from "@/lib/studio/StudioProvider";
import { StatCard } from "@/components/studio/practice/parts";

const MODS: Record<string, string> = { "1": "Fraud Risk Management", "2": "Fraud Detection & Analytics", "3": "Fraud Investigations" };
const L = (i: number) => String.fromCharCode(65 + i);

export function LibraryPage() {
  const t = useT();
  const { bank } = useStudioData();
  const [mod, setMod] = useState("1");
  const [chapter, setChapter] = useState("all");
  const [status] = useState("all");
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const list = useMemo(
    () =>
      bank.filter(
        (q) =>
          (mod === "all" || String(q.module) === mod) &&
          (chapter === "all" || q.chapter === chapter) &&
          (status === "all" || q.reviewStatus === status) &&
          (!query || (q.stem + " " + q.options.join(" ") + " " + q.chapter).toLowerCase().includes(query.toLowerCase())),
      ),
    [bank, mod, chapter, status, query],
  );
  const q = list[Math.min(current, Math.max(0, list.length - 1))];
  const subs = [...new Set(bank.filter((x) => mod === "all" || String(x.module) === mod).map((x) => x.chapter))];
  const countOf = (m: number) => bank.filter((x) => x.module === m).length;

  const reset = () => {
    setCurrent(0);
    setSelected([]);
    setChecked(false);
  };
  const commitSearch = () => {
    setQuery(searchRef.current?.value?.trim() || "");
    reset();
  };

  function choose(i: number, on: boolean) {
    const cur = list[current];
    if (!cur || checked) return;
    if (cur.kind === "single") setSelected([i]);
    else {
      let next = on ? [...new Set([...selected, i])] : selected.filter((x) => x !== i);
      if (next.length > cur.selectionCount) next = next.filter((x) => x !== i);
      setSelected(next);
    }
  }
  function move(step: number) {
    setCurrent(Math.max(0, Math.min(list.length - 1, current + step)));
    setSelected([]);
    setChecked(false);
  }

  return (
    <>
      <div className="page-intro">
        <div className="eyebrow muted">{t("library.eyebrow", "MORE CAFS PRACTICE")}</div>
        <h1>{t("library.title", "Supplemental Question Library")}</h1>
        <p>{`Practise ${bank.length} additional questions across all three modules. Filter by topic, check your answer, and review the reasoning. These supplementary items are separate from your main exam results.`}</p>
      </div>
      <div className="stats-grid">
        <StatCard title={t("library.statTotal", "Practice questions")} num={String(bank.length)} detail={t("library.statTotalNote", "All three modules")} icon="book" />
        <StatCard title={t("library.statM1", "Fraud Risk Management")} num={countOf(1)} detail={t("library.statM1Note", "Module 1")} icon="layout" />
        <StatCard title={t("library.statM2", "Detection & Analytics")} num={countOf(2)} detail={t("library.statM2Note", "Module 2")} icon="chart" />
        <StatCard title={t("library.statM3", "Fraud Investigations")} num={countOf(3)} detail={t("library.statM3Note", "Module 3")} icon="check" />
      </div>
      <div className="vault-controls">
        <label className="vault-label">
          {t("library.module", "Module")}
          <select
            id="impModule"
            value={mod}
            onChange={(e) => {
              setMod(e.target.value);
              setChapter("all");
              reset();
            }}
          >
            <option value="all">{t("library.allModules", "All 3 modules")}</option>
            {Object.entries(MODS).map(([id, n]) => (
              <option key={id} value={id}>
                Module {id}: {n}
              </option>
            ))}
          </select>
        </label>
        <label className="vault-label">
          {t("library.subchapter", "Subchapter")}
          <select
            id="impChapter"
            value={chapter}
            onChange={(e) => {
              setChapter(e.target.value);
              reset();
            }}
          >
            <option value="all">{t("library.allSubchapters", "All subchapters")}</option>
            {subs.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="vault-label">
          {t("library.find", "Find a topic or phrase")}
          <div className="row" style={{ display: "flex", gap: 7 }}>
            <input
              className="text-input"
              id="impSearch"
              type="search"
              ref={searchRef}
              defaultValue={query}
              placeholder="e.g. recall, evidence, mule"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitSearch();
                }
              }}
            />
            <button className="btn btn-sm" onClick={commitSearch}>
              {t("library.search", "Search")}
            </button>
          </div>
        </label>
      </div>
      <div className="vault-main">
        <section className="vault-card">
          {q ? (
            <>
              <div className="paper-header">
                <div>
                  <div className="q-overline">
                    {q.id} · {Math.min(current + 1, list.length)} OF {list.length} MATCHING
                  </div>
                  <div className="q-topic">{q.chapter}</div>
                </div>
                <span className={`q-badge ${q.kind === "multi" ? "multi" : ""}`}>{q.kind === "multi" ? "SELECT " + q.selectionCount : "SINGLE ANSWER"}</span>
              </div>
              <div className="stem">{q.stem}</div>
              <div className="vault-meta">{t("library.moduleMeta", "Module practice")}</div>
              {q.options.map((o, i) => (
                <label key={i} className={`vault-option ${checked ? (q.correct.includes(i) ? "correct" : selected.includes(i) ? "incorrect" : "") : selected.includes(i) ? "chosen" : ""}`}>
                  <input type={q.kind === "multi" ? "checkbox" : "radio"} name="impAnswer" checked={selected.includes(i)} disabled={checked} onChange={(e) => choose(i, e.target.checked)} />
                  <b>{L(i)}.</b>
                  <span>{o}</span>
                </label>
              ))}
              {checked ? (
                <div className="vault-feedback">
                  <strong>{selected.length === q.correct.length && selected.every((i) => q.correct.includes(i)) ? "Correct according to the practice key" : "Review the correct answer"}</strong>
                  <p>
                    Correct selection: <strong>{q.correct.map(L).join(", ")}</strong>
                  </p>
                  <p>{q.explanation}</p>
                  <p className="small muted">{t("library.feedbackNote", "If a statement seems unclear, compare it with the CAFS study guide before memorizing it.")}</p>
                </div>
              ) : null}
              <div className="vault-toolstrip">
                <button className="btn" disabled={current <= 0} onClick={() => move(-1)}>
                  {t("library.prev", "Previous")}
                </button>
                <button className="btn btn-primary" disabled={checked || !selected.length} onClick={() => setChecked(true)}>
                  {t("library.check", "Check answer")}
                </button>
                <button className="btn" disabled={current >= list.length - 1} onClick={() => move(1)}>
                  {t("library.next", "Next question")}
                </button>
              </div>
            </>
          ) : (
            <div className="empty">{t("library.empty", "No matching questions. Reset your filters.")}</div>
          )}
        </section>
        <aside className="vault-sidenote">
          <strong>{t("library.howTitle", "How to study effectively")}</strong>
          <p className="notice">{t("library.howTry", "Try answering before checking the explanation.")}</p>
          <ul>
            <li>{t("library.how1", "Identify what the question is really testing.")}</li>
            <li>{t("library.how2", "Explain why the closest alternative is weaker.")}</li>
            <li>{t("library.how3", "Use the chapter memorisation kit for related concepts.")}</li>
            <li>{t("library.how4", "Revisit questions you missed after another practice session.")}</li>
          </ul>
          <p className="notice">{t("library.howScores", "Supplemental scores do not change your six core mock-exam performance.")}</p>
        </aside>
      </div>
      <div className="callout">
        <Icon name="info" />
        <div>
          <strong>{t("library.calloutTitle", "Extra question practice")}</strong>
          <p>{t("library.calloutBody", "Use these questions to broaden recall. For final exam readiness, rely mainly on unfamiliar timed mocks and the areas you cannot explain without notes.")}</p>
        </div>
      </div>
    </>
  );
}
