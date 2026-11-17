"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { queryParam } from "@/components/studio/library/useQueryInit";
import { ModuleTabs, NEW_EXAM_IDS, SHORT, uniq, useAdvancedQuestions } from "@/components/studio/library/shared";
import { useBreadcrumb, useStudioData, useT } from "@/lib/studio/StudioProvider";
import { examHref } from "@/lib/studio/nav";
import { useStoredJSON } from "@/lib/studio/store";

const PRACTICE_KEY = "cafs_studio_v14_advanced_practice";
const NONE: Record<string, boolean> = {};
const LIMIT = 80;
const KINDS = ["single", "multi", "truefalse"];

const randomIndex = (n: number) => Math.floor(Math.random() * n);
const blabel = (k: string) => (k === "multi" ? "Multi-select" : k === "truefalse" ? "True / False" : "Single answer");

/** Deep link: ?module=2 filters the bank to that CAFS module. */
export function AdvancedBankPage() {
  useBreadcrumb("Advanced Fraud Question Bank");
  const t = useT();
  const router = useRouter();
  const { exams } = useStudioData();
  const { advanced, questions: ALL } = useAdvancedQuestions();
  const [practiced, setPracticed] = useStoredJSON<Record<string, boolean>>(PRACTICE_KEY, NONE);
  const [bankModule, setBankModule] = useState(() => Number(queryParam("module")) || 0);
  const [bankMock, setBankMock] = useState("");
  const [bankType, setBankType] = useState("");
  const [bankSearch, setBankSearch] = useState("");
  const [bankTopic, setBankTopic] = useState("");
  const [bankCurrent, setBankCurrent] = useState("");
  const [bankSelected, setBankSelected] = useState<number[]>([]);
  const [bankChecked, setBankChecked] = useState(false);
  const [bankLimit, setBankLimit] = useState(LIMIT);

  const exname = (k: string) => exams.find((x) => x.id === k)?.title || k;
  const filtered = ALL.filter(
    (x) =>
      (!bankModule || x.domain === bankModule) &&
      (!bankMock || x.mock === bankMock) &&
      (!bankType || x.kind === bankType) &&
      (!bankTopic || x.topic === bankTopic) &&
      (!bankSearch || [x.stem, x.topic, x.sourceMock, x.explanation].join(" ").toLowerCase().includes(bankSearch.toLowerCase())),
  );
  const list = filtered;
  // The original re-selects the first match whenever the current question drops out of the list.
  const q = list.find((x) => x.id === bankCurrent) ?? list[0];
  const current = q?.id ?? "";
  const topics = uniq(ALL.filter((x) => (!bankModule || x.domain === bankModule) && (!bankMock || x.mock === bankMock)).map((x) => x.topic));

  const pick = (id: string) => {
    setBankCurrent(id);
    setBankSelected([]);
    setBankChecked(false);
  };
  const randomQuestion = () => {
    if (list.length) pick(list[randomIndex(list.length)].id);
  };
  const exact = q ? q.correct.length === bankSelected.length && q.correct.every((a) => bankSelected.includes(a)) : false;

  return (
    <>
      <div className="page-intro">
        <div className="eyebrow muted">{t("advancedBank.eyebrow", "Separate practice · Not graded in official mock totals")}</div>
        <h1>{t("advancedBank.title", "Advanced Fraud Question Bank")}</h1>
        <p>
          Explore the {ALL.length} additional questions by CAFS module, source exam, question type and topic. Full 100-question exams remain available
          under Full Mock Exams; this area is for targeted learning.
        </p>
      </div>
      <ModuleTabs
        selected={bankModule}
        all
        onSelect={(n) => {
          setBankModule(n);
          setBankTopic("");
          setBankLimit(LIMIT);
          pick("");
        }}
      />
      <div className="v14-metrics">
        <div className="v14-metric">
          <b>{ALL.length}</b>
          <small>{t("advancedBank.metricImported", "Imported questions")}</small>
        </div>
        <div className="v14-metric">
          <b>{list.length}</b>
          <small>{t("advancedBank.metricMatching", "Matching filters")}</small>
        </div>
        <div className="v14-metric">
          <b>{Object.values(practiced).filter(Boolean).length}</b>
          <small>{t("advancedBank.metricChecked", "Checked during practice")}</small>
        </div>
        <div className="v14-metric">
          <b>{advanced.length}</b>
          <small>{t("advancedBank.metricSets", "Source mock sets")}</small>
        </div>
      </div>
      <div className="v14-filterbox">
        <div className="v14-filtergrid">
          <label>
            {t("advancedBank.search", "Search")}
            <input
              className="text-input"
              id="v14-bank-search"
              value={bankSearch}
              placeholder={t("advancedBank.searchPlaceholder", "Search questions and topics")}
              onChange={(e) => {
                setBankSearch(e.target.value);
                setBankLimit(LIMIT);
                pick("");
              }}
            />
          </label>
          <label>
            {t("advancedBank.source", "Source examination")}
            <select
              id="v14-bank-mock"
              value={bankMock}
              onChange={(e) => {
                setBankMock(e.target.value);
                setBankTopic("");
                pick("");
              }}
            >
              <option value="">{t("advancedBank.allMocks", "All four new mocks")}</option>
              {NEW_EXAM_IDS.map((x) => (
                <option key={x} value={x}>
                  {exname(x)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("advancedBank.type", "Question type")}
            <select
              id="v14-bank-type"
              value={bankType}
              onChange={(e) => {
                setBankType(e.target.value);
                pick("");
              }}
            >
              <option value="">{t("advancedBank.allTypes", "All question types")}</option>
              {KINDS.map((x) => (
                <option key={x} value={x}>
                  {blabel(x)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("advancedBank.topic", "Topic / case")}
            <select
              id="v14-bank-topic"
              value={bankTopic}
              onChange={(e) => {
                setBankTopic(e.target.value);
                pick("");
              }}
            >
              <option value="">{t("advancedBank.allTopics", "All topics / cases")}</option>
              {topics.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="v14-filterfoot">
          <button
            className="btn btn-sm"
            onClick={() => {
              setBankSearch("");
              setBankType("");
              setBankTopic("");
              setBankMock("");
              setBankLimit(LIMIT);
              pick("");
            }}
          >
            {t("advancedBank.clear", "Clear filters")}
          </button>
          <button className="btn btn-sm" onClick={randomQuestion}>
            {t("advancedBank.random", "Pick a random matching question")}
          </button>
          <span className="muted small">{t("advancedBank.multiNote", "Multi-select is scored by exact match in this study tool.")}</span>
        </div>
      </div>
      <div className="v14-banklayout">
        <aside className="v14-index">
          <strong>Questions ({list.length})</strong>
          <div className="v14-index-scroll">
            {list.length ? (
              list.slice(0, bankLimit).map((x) => (
                <button key={x.id} onClick={() => pick(x.id)} className={`v14-indexrow ${x.id === current ? "active" : ""}`}>
                  <span>{String(x.position).padStart(2, "0")}</span>
                  <div>
                    <strong>
                      {x.sourceMock} · {SHORT[x.domain]}
                    </strong>
                    <small>
                      {x.topic} · {blabel(x.kind)}
                    </small>
                  </div>
                  {practiced[x.id] ? "✓" : ""}
                </button>
              ))
            ) : (
              <p className="muted">{t("advancedBank.noQuestions", "No questions found.")}</p>
            )}
          </div>
          {list.length > bankLimit ? (
            <button className="btn btn-sm" onClick={() => setBankLimit((n) => n + LIMIT)}>
              {t("advancedBank.showMore", "Show more matches")}
            </button>
          ) : null}
        </aside>
        <article className="v14-bankpaper">
          {q ? (
            <>
              <div className="v14-paper-head">
                <span className="v14-tag">
                  {q.sourceMock} · Module {q.domain}
                </span>
                <span className="v14-tag">{blabel(q.kind)}</span>
              </div>
              <div className="muted small">
                Question {q.position} of Mock {q.mock.split("-")[1]} · {q.topic}
              </div>
              <h3>{q.stem}</h3>
              <div className="v14-answer-note">{q.kind === "multi" ? `Select ${q.correct.length} answers` : "Select one best answer"}</div>
              <div className="v14-answer-list">
                {q.options.map((o, i) => {
                  const yes = bankSelected.includes(i);
                  const correct = q.correct.includes(i);
                  const cls = bankChecked ? (correct ? "correct" : yes ? "wrong" : "") : yes ? "chosen" : "";
                  return (
                    <label key={i} className={`v14-answer ${cls}`}>
                      <input
                        type={q.kind === "multi" ? "checkbox" : "radio"}
                        name="v14-answer"
                        value={i}
                        checked={yes}
                        disabled={bankChecked}
                        onChange={(e) =>
                          setBankSelected((s) => (q.kind === "multi" ? (e.target.checked ? [...new Set([...s, i])] : s.filter((z) => z !== i)) : [i]))
                        }
                      />
                      <span className="v14-letter">{String.fromCharCode(65 + i)}</span>
                      <span>{o}</span>
                    </label>
                  );
                })}
              </div>
              {bankChecked ? (
                <div className={`v14-feedback ${exact ? "good" : "wrong"}`}>
                  <strong>
                    {exact ? "Correct" : "Review your answer"} · {q.correct.map((i) => String.fromCharCode(65 + i)).join(", ")}
                  </strong>
                  <p>{q.explanation}</p>
                  <small>{q.sourceSection}</small>
                </div>
              ) : null}
              <div className="v14-bankactions">
                {!bankChecked ? (
                  <button
                    className="btn btn-primary"
                    disabled={!bankSelected.length}
                    onClick={() => {
                      if (!bankSelected.length) return;
                      setBankCurrent(q.id);
                      setBankChecked(true);
                      setPracticed((p) => ({ ...p, [q.id]: true }));
                    }}
                  >
                    {t("advancedBank.check", "Check answer")}
                  </button>
                ) : (
                  <button
                    className="btn"
                    onClick={() => {
                      setBankSelected([]);
                      setBankChecked(false);
                    }}
                  >
                    {t("advancedBank.tryAgain", "Try again")}
                  </button>
                )}
                <button
                  className="btn"
                  onClick={() => {
                    const i = list.findIndex((x) => x.id === current);
                    pick(list[(i + 1) % list.length]?.id || "");
                  }}
                >
                  {t("advancedBank.next", "Next matching question")}
                </button>
                <button className="btn" onClick={() => router.push(examHref(q.mock))}>
                  {t("advancedBank.openMock", "Open full mock")}
                </button>
              </div>
            </>
          ) : (
            <div className="empty">{t("advancedBank.empty", "No questions match these filters. Clear some filters to continue.")}</div>
          )}
        </article>
      </div>
    </>
  );
}
