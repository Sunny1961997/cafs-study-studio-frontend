"use client";

import { useMemo, useState } from "react";
import { ModuleFrame } from "@/components/studio/modules/ModuleFrame";
import "@/components/studio/modules/ik.css";
import { useBreadcrumb, useStudioData, useT } from "@/lib/studio/StudioProvider";
import { useStoredJSON } from "@/lib/studio/store";
import type { Rec } from "@/lib/studio/types";

const COMPLETED_KEY = "cafs-lessons-phase3-progress-v1";
const SAVED_KEY = "cafs-integration-saved-v1";
const EMPTY: string[] = [];
const COLOR: Record<string, string> = {
  "Fraud typologies": "#159f93",
  "Risk & governance": "#477dbd",
  "Analytics & monitoring": "#a386c5",
  "Investigation & response": "#e4a255",
};

type Tab = "dashboard" | "lessons" | "graph" | "practice" | "matrix" | "index";
type Answers = Record<string, number[]>;

const letter = (i: number) => String.fromCharCode(65 + i);
const arraysEqual = (a: number[], b: number[]) => {
  const sb = b.slice().sort((x, y) => x - y);
  return a.length === b.length && a.slice().sort((x, y) => x - y).every((v, i) => v === sb[i]);
};
const shuffled = <T,>(items: T[]) => {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const saveFile = (name: string, content: string, mime = "text/plain") => {
  const blob = new Blob([content], { type: mime + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};
/** The parent page scrolls the module header into view when a tab / "open" button is used. */
const scrollToContext = () => {
  requestAnimationFrame(() => document.querySelector(".cafs22-context")?.scrollIntoView({ block: "start", behavior: "instant" }));
};

export function IntegratedKnowledgeModule() {
  const t = useT();
  const { ikData, ikChapters } = useStudioData();
  const ROWS = ikData.rows;
  const INDEX = ikData.index;
  const QUESTIONS = ikData.questions;
  const CAT = ikData.catmeta as Rec;
  const CH = ikChapters;
  const byId = useMemo(() => Object.fromEntries(ROWS.map((r) => [r.id, r])) as Record<string, Rec>, [ROWS]);
  const N = ROWS.length;
  const label = `${t("ik.labelPre", "Integrated Knowledge")} · ${N} ${t("ik.labelPost", "Topics")}`;
  useBreadcrumb(label);

  const [completedList, setCompletedList] = useStoredJSON<string[]>(COMPLETED_KEY, EMPTY);
  const [savedList, setSavedList] = useStoredJSON<string[]>(SAVED_KEY, EMPTY);
  const completed = useMemo(() => new Set(Array.isArray(completedList) ? completedList : []), [completedList]);
  const saved = useMemo(() => new Set(Array.isArray(savedList) ? savedList : []), [savedList]);

  const defaultTopic = byId["T16"] ? "T16" : ROWS[0]?.id;
  const [tab, setTab] = useState<Tab>("dashboard");
  const [activeTopic, setActiveTopic] = useState<string>(defaultTopic);
  const [lessonAnswers, setLessonAnswers] = useState<Answers>({});
  const [lessonGraded, setLessonGraded] = useState(false);
  const [lessonSearch, setLessonSearch] = useState("");
  const [lessonCat, setLessonCat] = useState("all");
  const [lessonFilter, setLessonFilter] = useState("all");
  const [graphCat, setGraphCat] = useState("all");
  const [graphFocus, setGraphFocus] = useState<string>(defaultTopic);
  const [examCat, setExamCat] = useState("all");
  const [examType, setExamType] = useState("all");
  const [examCount, setExamCount] = useState("15");
  const [session, setSession] = useState<Rec[]>([]);
  const [examAnswers, setExamAnswers] = useState<Answers>({});
  const [examGraded, setExamGraded] = useState(false);
  const [examPage, setExamPage] = useState(0);
  const [matrixSearch, setMatrixSearch] = useState("");
  const [matrixCat, setMatrixCat] = useState("all");
  const [matrixCover, setMatrixCover] = useState("all");
  const [indexSearch, setIndexSearch] = useState("");
  const [indexChapter, setIndexChapter] = useState("all");

  const percent = N ? Math.round((completed.size / N) * 100) : 0;
  const pagesOf = (r: Rec) => Object.values(r.pages as Record<string, string>);

  const switchTab = (id: Tab) => setTab(id);
  const tabClick = (id: Tab) => {
    switchTab(id);
    scrollToContext();
  };
  const openLesson = (id: string) => {
    if (!byId[id]) return;
    setActiveTopic(id);
    setLessonAnswers({});
    setLessonGraded(false);
    setTab("lessons");
  };

  const currentLessons = ROWS.filter((r) => {
    const query = lessonSearch.trim().toLowerCase();
    return (
      (lessonCat === "all" || r.category === lessonCat) &&
      (lessonFilter === "all" || (lessonFilter === "done" && completed.has(r.id)) || (lessonFilter === "todo" && !completed.has(r.id)) || (lessonFilter === "saved" && saved.has(r.id))) &&
      (!query || [r.id, r.title, r.summary, r.category, ...pagesOf(r)].join(" ").toLowerCase().includes(query))
    );
  });

  const toggleIn = (setList: (next: (prev: string[]) => string[]) => void, id: string) =>
    setList((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    });

  const setAnswer = (where: "lesson" | "exam", q: Rec, v: number, checked: boolean) => {
    if (where === "lesson" ? lessonGraded : examGraded) return;
    const apply = (cur: Answers): Answers => {
      if (q.multi) {
        const set = new Set(cur[q.id] || []);
        if (checked) set.add(v);
        else set.delete(v);
        return { ...cur, [q.id]: [...set] };
      }
      return { ...cur, [q.id]: [v] };
    };
    if (where === "lesson") setLessonAnswers(apply);
    else setExamAnswers(apply);
  };

  const questionBlock = (q: Rec, number: number, where: "lesson" | "exam", readOnly: boolean) => {
    const selected = (where === "lesson" ? lessonAnswers : examAnswers)[q.id] || [];
    return (
      <div className="question" id={`${where}-${q.id}`} key={q.id}>
        <span className="label">
          Q{number} · {q.multi ? t("ik.q.selectN", "Select") + " " + q.correct.length : t("ik.q.selectOne", "Select ONE")} · {q.lesson}{" "}
        </span>
        <h4>{q.prompt}</h4>
        {(q.options as string[]).map((o, i) => {
          const check = selected.includes(i);
          const css = readOnly ? (q.correct.includes(i) ? " correct" : check ? " wrong" : "") : "";
          return (
            <label className={`choice${css}`} key={i}>
              <input
                type={q.multi ? "checkbox" : "radio"}
                name={`${where}-${q.id}`}
                value={i}
                data-qid={q.id}
                data-where={where}
                checked={check}
                disabled={readOnly}
                onChange={(e) => setAnswer(where, q, i, e.target.checked)}
              />
              <span>
                <b>{letter(i)}.</b> {o}
              </span>
            </label>
          );
        })}
        {readOnly ? (
          <div className="q-result">
            <strong>{arraysEqual(selected, q.correct) ? t("ik.q.correct", "Correct") : t("ik.q.review", "Review answer")}.</strong> {t("ik.q.correctOptions", "Correct options:")}{" "}
            {(q.correct as number[]).map(letter).join(", ")}. {q.explain}
          </div>
        ) : null}
      </div>
    );
  };

  // ---- lessons
  const renderLesson = () => {
    const r = byId[activeTopic];
    if (!r) return null;
    const savedHere = saved.has(r.id);
    const isComplete = completed.has(r.id);
    const related = (r.related as string[]).map((id) => byId[id]);
    const ids = QUESTIONS.filter((q) => q.lesson === activeTopic);
    const deep = r.deep as Rec | null;
    const chunks = String(r.distinction)
      .split(";")
      .map((s) => s.trim());
    const perspective = (ch: number) => {
      const c = chunks.find((s) => s.startsWith("Chapter " + ch));
      return c ? c.replace(/^Chapter \d\s*/, "") : t("ik.noDistinct", "The cross-chapter mapping does not identify a distinct standalone treatment here.");
    };
    return (
      <>
        <article className="panel lesson-header">
          <div className="chips">
            <span className="chip teal">{r.id} · {r.category}</span>
            <span className="chip">{r.type}</span>
            <span className="chip">{pagesOf(r).filter(Boolean).length} {t("ik.chaptersLinked", "chapters linked")}</span>
            {deep ? <span className="chip teal">{t("ik.deepAvailable", "Extended deep dive available")}</span> : null}
          </div>
          <h2>{r.title}</h2>
          <p style={{ fontSize: 15, color: "#476278" }}>{r.summary}</p>
          <div className="buttons no-print">
            <button className={`btn ${isComplete ? "outline" : ""}`} id="mark-read" onClick={() => toggleIn(setCompletedList, activeTopic)}>
              {isComplete ? t("ik.completedUndo", "✓ Completed · undo") : t("ik.markStudied", "Mark as studied")}
            </button>
            <button className="btn grey" id="mark-save" onClick={() => toggleIn(setSavedList, activeTopic)}>
              {savedHere ? t("ik.bookmarked", "★ Bookmarked") : t("ik.bookmark", "☆ Bookmark")}
            </button>
            <button className="btn grey" id="print-topic" onClick={() => window.print()}>{t("ik.printTopic", "Print topic")}</button>
          </div>
          <div style={{ marginTop: 11 }} className="tiny">{t("ik.synth", "The lesson synthesizes the guide; the scenario and question bank are original practice illustrations.")}</div>
        </article>
        <article className="panel">
          <span className="label">{t("ik.crossConn", "Cross-chapter connection")}</span>
          <h3 style={{ margin: "7px 0 10px" }}>{t("ik.whatChanges", "What changes between the chapters?")}</h3>
          <div className="info-grid">
            {[1, 2, 3].map((ch) => {
              const pages = r.pages[String(ch)];
              const heads = r.heads?.[String(ch)] as string[] | undefined;
              return (
                <div className="info" key={ch}>
                  <strong>{t("ik.chapterWord", "CHAPTER")} {ch} · {CH[String(ch)]}</strong>
                  <span className="pageno">{pages ? t("ik.printedPp", "Printed pp.") + " " + pages : t("ik.notMapped", "Not directly mapped")}</span>
                  <p>{pages ? perspective(ch) : t("ik.relatedMayExist", "Related application may exist, but this topic is not assigned a direct chapter reference in the existing mapping.")}</p>
                  {pages && heads?.length ? <div className="sourceheads">{t("ik.cues", "Source section cues:")} {heads.slice(0, 4).join(" · ")}</div> : null}
                </div>
              );
            })}
          </div>
          <h3 className="sectiontitle">{t("ik.consolidated", "Consolidated concepts to master")}</h3>
          <div className="note-list">
            {(r.notes as string[]).map((n, i) => (
              <div className="note" key={i}>
                <i>{i + 1}</i>
                <div>{n}</div>
              </div>
            ))}
          </div>
          <div className="case">
            <strong>{t("ik.appScenario", "Application scenario")}</strong>
            <p>{r.scenario}</p>
            <div className="decision"><b>{t("ik.mostDefensible", "Most defensible action:")}</b> {r.best}</div>
          </div>
          <div className="compact-columns">
            <div>
              <h3>{t("ik.confuse", "Easy-to-confuse choices")}</h3>
              <ol className="traps">
                {(r.traps as string[]).map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ol>
            </div>
            <div>
              <h3>{t("ik.lens", "CAFS decision lens")}</h3>
              <p style={{ fontSize: 13 }}>{r.exam}</p>
              <p style={{ fontSize: 12, color: "#63798a" }}><b>{t("ik.remember", "Remember:")}</b> {r.summary}</p>
            </div>
          </div>
          {deep ? (
            <>
              <h3 className="sectiontitle">{t("ik.deepTitle", "Expanded original deep-dive lesson")}</h3>
              <p>{deep.lead}</p>
              {(deep.sections as Rec[]).map((s, i) => (
                <div className="extended" key={i}>
                  <h4>{s.heading}</h4>
                  <ul>
                    {(s.points as string[]).map((p, j) => (
                      // the deep-dive points are HTML fragments in the source data (the original used innerHTML)
                      <li key={j} dangerouslySetInnerHTML={{ __html: p }} />
                    ))}
                  </ul>
                </div>
              ))}
              <div className="case">
                <strong>{t("ik.earlierCase", "Earlier full case:")} {deep.scenario.name}</strong>
                <p>{deep.scenario.facts}</p>
                {(deep.scenario.steps as Rec[]).map((st, i) => (
                  <div className="note" key={i}>
                    <i>→</i>
                    <div>
                      <strong>{st.label}</strong>
                      <div>{st.text}</div>
                    </div>
                  </div>
                ))}
                <p><b>{deep.scenario.conclusion}</b></p>
              </div>
            </>
          ) : null}
          <h3 className="sectiontitle">{t("ik.relatedLessons", "Related lessons")}</h3>
          {related.filter(Boolean).map((x) => (
            <button className="linkpill no-print" key={x.id} data-follow={x.id} onClick={() => openLesson(x.id)}>
              {x.id} · {x.title}
            </button>
          ))}
          <p className="notice">{t("ik.sourcePointers", "Source pointers use the printed page numbers in the three modules. Revisit the cited sections when an individual explanation needs fuller detail.")}</p>
        </article>
        <article className="panel no-print">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <span className="label">{t("ik.practiceRetention", "Practice and retention")}</span>
              <h3 style={{ margin: "5px 0" }}>{t("ik.testConnection", "Test the connection")}</h3>
            </div>
            <div id="lesson-quiz-toolbar" style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
              <span className="tiny">
                {ids.length} {t("ik.topicQuestions", "topic questions")} · {ids.filter((q) => q.multi).length} {t("ik.multiSelect", "multi-select")}
              </span>
              <div className="buttons">
                <button className="btn" id="grade-lesson" disabled={lessonGraded} onClick={() => setLessonGraded(true)}>
                  {lessonGraded ? t("ik.graded", "Graded") : t("ik.gradeThese", "Grade these questions")}
                </button>
                <button
                  className="btn outline"
                  id="reset-lesson-quiz"
                  onClick={() => {
                    setLessonAnswers({});
                    setLessonGraded(false);
                  }}
                >
                  {t("ik.resetAnswers", "Reset answers")}
                </button>
              </div>
            </div>
          </div>
          <div id="lesson-quiz">{ids.map((q, i) => questionBlock(q, i + 1, "lesson", lessonGraded))}</div>
        </article>
      </>
    );
  };

  // ---- graph
  const graphNode = (id: string, x: number, y: number, large: boolean, short: string) => {
    const r = byId[id];
    const fill = COLOR[r.category];
    const lbl = short ? short : r.title;
    const trimmed = lbl.length > 25 ? lbl.slice(0, 23) + "…" : lbl;
    const pick = () => setGraphFocus(id);
    return (
      <g
        className="graph-node"
        tabIndex={0}
        role="button"
        data-node={id}
        aria-label={r.title}
        key={id}
        onClick={pick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            pick();
          }
        }}
      >
        <circle cx={x} cy={y} r={large ? 69 : 49} fill={fill} fillOpacity={large ? "0.14" : "0.12"} stroke={fill} strokeWidth={large ? 3 : 2} />
        <text x={x} y={y - 7} textAnchor="middle" fontWeight="800" fontSize={large ? 16 : 13} fill="#183850">{id}</text>
        <text x={x} y={y + 11} fontSize={large ? 12 : 10} textAnchor="middle" fill="#456279">{trimmed}</text>
      </g>
    );
  };
  const renderGraph = () => {
    const focus = graphFocus || defaultTopic;
    const r = byId[focus];
    if (!r) return null;
    const peers = (r.related as string[]).map((id) => byId[id]).filter(Boolean);
    const cx = 450;
    const cy = 237;
    const rad = 180;
    return (
      <svg viewBox="0 0 900 490" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="900" height="490" fill="#fbfefe" />
        {peers.map((p, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / peers.length;
          const x = cx + rad * Math.cos(angle);
          const y = cy + rad * Math.sin(angle);
          return (
            <g key={p.id}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke="#aabeca" strokeWidth="2" strokeDasharray="5,5" />
              {graphNode(p.id, x, y, false, String(p.title).split(" ").slice(0, 3).join(" "))}
            </g>
          );
        })}
        {graphNode(focus, cx, cy, true, String(r.title).split(" ").slice(0, 4).join(" "))}
      </svg>
    );
  };
  const focusRow = byId[graphFocus || defaultTopic];
  const focusPeers = focusRow ? (focusRow.related as string[]).map((id) => byId[id]).filter(Boolean) : [];

  // ---- practice
  const startExam = () => {
    const pool = shuffled(QUESTIONS.filter((q) => (examCat === "all" || q.category === examCat) && (examType === "all" || (examType === "multi") === q.multi)));
    const max = Number(examCount);
    setSession(pool.slice(0, Math.min(max, pool.length)));
    setExamPage(0);
    setExamAnswers({});
    setExamGraded(false);
  };
  const per = 10;
  const lastPage = Math.ceil(session.length / per) - 1;
  const goPage = (delta: number) => setExamPage((p) => Math.max(0, Math.min(p + delta, lastPage)));
  const examResult = examGraded ? session.filter((q) => arraysEqual(examAnswers[q.id] || [], q.correct)).length : null;
  const examDone = session.filter((q) => (examAnswers[q.id] || []).length).length;
  const downloadReport = () => {
    const report = session.map((q, i) => ({
      question: i + 1,
      id: q.id,
      topic: q.lesson,
      multi: q.multi,
      correct: arraysEqual(examAnswers[q.id] || [], q.correct),
      selected: (examAnswers[q.id] || []).map(letter),
      correct_options: (q.correct as number[]).map(letter),
    }));
    saveFile("CAFS_Practice_Score_Report.json", JSON.stringify({ result: report.filter((x) => x.correct).length + "/" + report.length, questions: report }, null, 2), "application/json");
  };
  const pager = (prefix: string) => (
    <>
      <button className="btn outline" data-page="previous" disabled={examPage === 0} onClick={() => goPage(-1)}>{prefix === "top" ? t("ik.previous", "Previous") : t("ik.previousPage", "Previous page")}</button>
      <button className="btn outline" data-page="next" disabled={examPage === lastPage} onClick={() => goPage(1)}>{prefix === "top" ? t("ik.next", "Next") : t("ik.nextPage", "Next page")}</button>
    </>
  );

  // ---- matrix
  const matrixRows = ROWS.filter((r) => {
    const term = matrixSearch.toLowerCase();
    return (
      (matrixCat === "all" || matrixCat === r.category) &&
      [r.title, r.category, r.id, r.summary, ...pagesOf(r)].join(" ").toLowerCase().includes(term) &&
      (matrixCover === "all" || matrixCover.split("").every((n) => r.pages[n]))
    );
  });
  const exportMatrix = () => {
    const csv = [["ID", "Category", "Title", "Type", "Chapter 1", "Chapter 2", "Chapter 3", "Integrated summary"], ...ROWS.map((r) => [r.id, r.category, r.title, r.type, r.pages[1], r.pages[2], r.pages[3], r.summary])]
      .map((row) => row.map((v) => '"' + String(v ?? "").replace(/"/g, '""') + '"').join(","))
      .join("\r\n");
    saveFile("CAFS_54_Topic_Matrix.csv", "﻿" + csv, "text/csv");
  };

  // ---- index
  const indexTerm = indexSearch.trim().toLowerCase();
  const indexMatches = INDEX.filter((x) => (indexChapter === "all" || String(x.chapter) === indexChapter) && (!indexTerm || (x.title + " " + x.page).toLowerCase().includes(indexTerm)));

  const catKeys = Object.keys(CAT);
  const catOptions = catKeys.map((c) => (
    <option key={c} value={c}>{c}</option>
  ));
  const advanced = QUESTIONS.filter((q) => !/-[SM]$/.test(String(q.id))).length;
  const scenarios = QUESTIONS.filter((q) => /-S$/.test(String(q.id))).length;
  const multis = QUESTIONS.filter((q) => /-M$/.test(String(q.id))).length;
  const pageCls = (id: Tab) => `page${tab === id ? " active" : ""}`;
  const tabs: [Tab, string][] = [
    ["dashboard", t("ik.tab.overview", "Overview")],
    ["lessons", `${N} ${t("ik.tab.lessons", "Lessons")}`],
    ["graph", t("ik.tab.graph", "Knowledge Graph")],
    ["practice", `${t("ik.tab.practice", "Practice Lab")} · ${QUESTIONS.length}`],
    ["matrix", t("ik.tab.matrix", "Cross-chapter Matrix")],
    ["index", t("ik.tab.index", "Chapter Index")],
  ];

  return (
    <ModuleFrame
      label={label}
      tag={`${t("ik.tagPrefix", "COMPLETE LEARNING MODULE")} · ${N} ${t("ik.tagTopics", "TOPICS")} / ${QUESTIONS.length} ${t("ik.tagQuestions", "QUESTIONS")}`}
      desc={`${t("ik.ctx1", "Study all")} ${N} ${t("ik.ctx2", "cross-chapter connections, explore the concept graph and chapter matrix, and complete the companion’s")} ${QUESTIONS.length}${t("ik.ctx3", "-question practice lab.")}`}
      tip={t("ik.tip", "This module is fully included in this HTML file and runs offline. Its own navigation, quiz responses, and learning progress are separate from the original Studio exam scores. To move saved progress from an earlier HTML file, use the Studio backup and restore controls.")}
    >
      <div className="cafs-ik">
        <header className="head">
          <div className="wrap head-inner">
            <div className="brand"><span className="logo">CAFS</span><span>{t("ik.brand", "Integrated Knowledge Studio")}</span></div>
            <small>{t("ik.brandSub", "Personal revision companion · ACAMS CAFS v1.03")}</small>
          </div>
        </header>
        <section className="hero">
          <div className="wrap">
            <span className="eyebrow">{t("ik.eyebrow", "Complete cross-chapter learning companion")}</span>
            <h1>{t("ik.h1", "Learn the connections, not three isolated chapters.")}</h1>
            <p>
              {N} {t("ik.hero1", "interconnected themes, source-page mapping, integrated learning notes, cross-chapter visual relationships, and")} {QUESTIONS.length} {t("ik.hero2", "original exam-style checks. Works offline in Chrome and Edge.")}
            </p>
            <div className="stats">
              <div className="stat"><strong>{N}</strong><span>{t("ik.stat1", "Integrated topic lessons")}</span></div>
              <div className="stat"><strong>{QUESTIONS.length}</strong><span>{t("ik.stat2", "Practice questions")}</span></div>
              <div className="stat"><strong>{INDEX.length}</strong><span>{t("ik.stat3", "Indexed guide headings")}</span></div>
              <div className="stat"><strong id="stat-completed">{completed.size} / {N}</strong><span>{t("ik.stat4", "Topics completed")}</span></div>
            </div>
          </div>
        </section>
        <main className="wrap">
          <div className="tabs" role="tablist" aria-label="Study studio sections">
            {tabs.map(([id, text]) => (
              // eslint-disable-next-line jsx-a11y/role-supports-aria-props -- same attribute as the original module
              <button key={id} className={`tab${tab === id ? " active" : ""}`} type="button" data-tab={id} aria-selected={tab === id} onClick={() => tabClick(id)}>{text}</button>
            ))}
          </div>

          <section className={pageCls("dashboard")} id="dashboard">
            <div className="panel">
              <span className="label">{t("ik.route", "Your learning route")}</span>
              <h2>{t("ik.routeTitle", "Understand how fraud-management concepts form a single system")}</h2>
              <div className="diagram-row">
                <div className="diagram-step"><strong>{t("ik.step1", "01 · Governance")}</strong><small>{t("ik.step1d", "Risk taxonomy, EWRA, RCSA, controls and accountability")}</small></div>
                <div className="arrow">→</div>
                <div className="diagram-step"><strong>{t("ik.step2", "02 · Analytics")}</strong><small>{t("ik.step2d", "Data preparation, patterns, models, monitoring and triage")}</small></div>
                <div className="arrow">→</div>
                <div className="diagram-step"><strong>{t("ik.step3", "03 · Investigation")}</strong><small>{t("ik.step3d", "Evidence, determination, reporting, losses and closure")}</small></div>
                <div className="arrow">↻</div>
                <div className="diagram-step"><strong>{t("ik.step4", "04 · Feedback")}</strong><small>{t("ik.step4d", "RCA, lessons learned, recalibration and assurance")}</small></div>
              </div>
              <p className="notice">{t("ik.arrowsNote", "The arrows are an editorial learning model connecting topics covered in the three course modules, rather than a formally specified ACAMS lifecycle chart.")}</p>
            </div>
            <div id="dashboard-paths" className="dashboard">
              {Object.entries(CAT).map(([k, v]) => {
                const arr = ROWS.filter((r) => r.category === k);
                const done = arr.filter((r) => completed.has(r.id)).length;
                return (
                  <button
                    className="dash-card"
                    key={k}
                    data-path={k}
                    onClick={() => {
                      setLessonCat(k);
                      switchTab("lessons");
                    }}
                  >
                    <span className="label">{v.tag}</span>
                    <div className="big">{done} / {arr.length}</div>
                    <h3>{k}</h3>
                    <p className="tiny">{v.description}</p>
                    <div className="progress"><div style={{ width: `${(done / arr.length) * 100}%` }} /></div>
                  </button>
                );
              })}
            </div>
            <div className="panel" style={{ marginTop: 16 }}>
              <h3>{t("ik.reviewProgress", "Review progress")}</h3>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <span className="tiny" id="overview-progress">{completed.size} {t("ik.of", "of")} {N} {t("ik.topicsCompleted", "topics completed")}</span>
                <span className="tiny" id="bookmark-count">{saved.size} {t("ik.topicsBookmarked", "topics bookmarked")}</span>
              </div>
              <div className="progress" style={{ margin: "12px 0 16px" }}><div id="overview-bar" style={{ width: `${percent}%` }} /></div>
              <div className="buttons">
                <button className="btn" id="continue-btn" onClick={() => openLesson((ROWS.find((r) => !completed.has(r.id)) || ROWS[0]).id)}>{t("ik.continue", "Continue studying")}</button>
                <button className="btn outline" data-open="practice" onClick={() => tabClick("practice")}>{t("ik.startExam", "Start an exam session")}</button>
                <button
                  className="btn grey"
                  id="export-progress"
                  onClick={() => saveFile("CAFS_Revision_Progress.json", JSON.stringify({ date: new Date().toISOString(), completed: [...completed], bookmarked: [...saved] }, null, 2), "application/json")}
                >
                  {t("ik.exportProgress", "Export study progress")}
                </button>
              </div>
            </div>
            <div className="panel">
              <h3>{t("ik.anchors", "Memory anchors for CAFS scenarios")}</h3>
              <div className="vocab">
                <div><strong>{t("ik.a1", "Risk is not a transaction")}</strong><p>{t("ik.a1d", "An inherent or residual risk assessment governs exposure; a detection score evaluates an event. Do not substitute one for the other.")}</p></div>
                <div><strong>{t("ik.a2", "Anomaly is not proof")}</strong><p>{t("ik.a2d", "A rule or model flags a pattern. Investigation tests explanation, identity, intent and supporting records.")}</p></div>
                <div><strong>{t("ik.a3", "Closure is not completion")}</strong><p>{t("ik.a3d", "A well-documented case may still expose control weaknesses requiring a new risk assessment or detection rule.")}</p></div>
              </div>
            </div>
          </section>

          <section className={pageCls("lessons")} id="lessons">
            <div className="grid-lesson">
              <aside className="sidebar panel">
                <div>
                  <span className="label">{t("ik.library", "Topic library")}</span>
                  <h3 style={{ margin: "4px 0 10px" }}>{N} {t("ik.integratedLessons", "integrated lessons")}</h3>
                  <input className="field" id="lesson-search" type="search" placeholder={t("ik.searchLessons", "Search lessons and references")} aria-label="Search lessons" value={lessonSearch} onChange={(e) => setLessonSearch(e.target.value)} />
                </div>
                <div className="filter-row">
                  <select className="field" id="lesson-category" aria-label="Lesson category" value={lessonCat} onChange={(e) => setLessonCat(e.target.value)}>
                    <option value="all">{t("ik.allGroups", "All groups")}</option>
                    {catOptions}
                  </select>
                  <select className="field" id="lesson-filter" aria-label="Lesson status" value={lessonFilter} onChange={(e) => setLessonFilter(e.target.value)}>
                    <option value="all">{t("ik.allTopics", "All topics")}</option>
                    <option value="todo">{t("ik.notStudied", "Not yet studied")}</option>
                    <option value="done">{t("ik.completed", "Completed")}</option>
                    <option value="saved">{t("ik.bookmarkedOpt", "Bookmarked")}</option>
                  </select>
                </div>
                <div className="tiny" id="lesson-count">{t("ik.showing", "Showing")} {currentLessons.length} {t("ik.of", "of")} {N} {t("ik.topics", "topics")}</div>
                <div className="list" id="lesson-list">
                  {currentLessons.length ? (
                    currentLessons.map((r) => (
                      <button className={`lesson-list-btn ${r.id === activeTopic ? "active" : ""}`} key={r.id} data-lesson={r.id} aria-current={r.id === activeTopic ? "true" : "false"} onClick={() => openLesson(r.id)}>
                        <span className="number">{r.id}</span>
                        <span>
                          <strong>{r.title} {completed.has(r.id) ? "✓" : ""}</strong>
                          <small>{CAT[r.category].tag} · {r.deep ? t("ik.deepPlus", "Deep dive + ") : ""}{t("ik.twoQuestions", "2 questions")}</small>
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="noresults">{t("ik.noLessons", "No matching lessons")}</div>
                  )}
                </div>
                <div>
                  <div className="tiny" id="lesson-progress-text">{completed.size} {t("ik.of", "of")} {N} {t("ik.complete", "complete")} · {percent}%</div>
                  <div className="progress" style={{ marginTop: 7 }}><div id="lesson-progress-bar" style={{ width: `${percent}%` }} /></div>
                </div>
              </aside>
              <div className="lesson-view" id="lesson-content">{renderLesson()}</div>
            </div>
          </section>

          <section className={pageCls("graph")} id="graph">
            <div className="panel">
              <span className="label">{t("ik.visualPhase", "Visual phase")}</span>
              <h2>{t("ik.graphTitle", "Cross-chapter knowledge graph")}</h2>
              <p className="tiny">{t("ik.graphHint", "Select a topic to inspect its nearest conceptual bridges. Connections are editorial study relationships, not a mathematical similarity score or official ACAMS blueprint.")}</p>
              <div className="map-filters">
                <select
                  className="field"
                  id="graph-category"
                  aria-label="Graph category"
                  value={graphCat}
                  onChange={(e) => {
                    const c = e.target.value;
                    setGraphCat(c);
                    const r = ROWS.find((x) => c === "all" || x.category === c);
                    if (r) setGraphFocus(r.id);
                  }}
                >
                  <option value="all">{t("ik.allCategories", "All categories")}</option>
                  {catOptions}
                </select>
                <select className="field" id="graph-focus" aria-label="Graph focus" value={graphFocus} onChange={(e) => setGraphFocus(e.target.value)}>
                  {ROWS.map((r) => (
                    <option key={r.id} value={r.id}>{r.id} · {r.title}</option>
                  ))}
                </select>
                <button
                  className="btn grey"
                  id="graph-reset"
                  onClick={() => {
                    setGraphCat("all");
                    setGraphFocus(defaultTopic);
                  }}
                >
                  {t("ik.resetFocus", "Reset focus")}
                </button>
              </div>
              <div className="map-vis" id="graph-canvas" role="img" aria-label="Selected topic and related study concepts">{renderGraph()}</div>
              <div className="legend" style={{ marginTop: 12 }}>
                <span><b style={{ background: "#159f93" }} />{t("ik.legend1", "Fraud typologies")}</span>
                <span><b style={{ background: "#477dbd" }} />{t("ik.legend2", "Risk & governance")}</span>
                <span><b style={{ background: "#a386c5" }} />{t("ik.legend3", "Analytics & monitoring")}</span>
                <span><b style={{ background: "#e4a255" }} />{t("ik.legend4", "Investigation & response")}</span>
              </div>
            </div>
            <div className="panel">
              <h3 id="graph-title">{focusRow ? `${focusRow.id} · ${focusRow.title} · ${focusPeers.length} ${t("ik.connectedTopics", "connected topics")}` : t("ik.connectedTopicsTitle", "Connected topics")}</h3>
              <div id="graph-related">
                {focusRow ? (
                  <>
                    <p>{focusRow.summary}</p>
                    {focusPeers.map((x) => (
                      <button className="linkpill" key={x.id} data-graph-lesson={x.id} onClick={() => openLesson(x.id)}>{x.id} · {x.title}</button>
                    ))}
                    <div style={{ marginTop: 15 }}>
                      <button className="btn" data-graph-lesson={focusRow.id} onClick={() => openLesson(focusRow.id)}>{t("ik.read", "Read")} {focusRow.id} {t("ik.integratedLesson", "integrated lesson")}</button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </section>

          <section className={pageCls("practice")} id="practice">
            <div className="panel">
              <span className="label">{t("ik.examPhase", "Exam preparation phase")}</span>
              <h2>{t("ik.labTitle", "Integrated practice lab")}</h2>
              <p className="tiny">
                {QUESTIONS.length} {t("ik.lab1", "original self-check questions, including")} {scenarios} {t("ik.lab2", "scenario decisions,")} {multis} {t("ik.lab3", "multi-select questions and")} {advanced} {t("ik.lab4", "retained advanced questions from Phase 3. These are not official ACAMS examination questions.")}
              </p>
              <div className="exam-controls">
                <select className="field" id="exam-category" aria-label="Exam category" value={examCat} onChange={(e) => setExamCat(e.target.value)}>
                  <option value="all">{t("ik.allTopics", "All topics")}</option>
                  {catOptions}
                </select>
                <select className="field" id="exam-type" aria-label="Question type" value={examType} onChange={(e) => setExamType(e.target.value)}>
                  <option value="all">{t("ik.mixed", "Mixed: single + multi")}</option>
                  <option value="single">{t("ik.singleOnly", "Single answer only")}</option>
                  <option value="multi">{t("ik.multiOnly", "Multi-select only")}</option>
                </select>
                <select className="field" id="exam-count" aria-label="Number of questions" value={examCount} onChange={(e) => setExamCount(e.target.value)}>
                  <option value="15">15 {t("ik.questionsWord", "questions")}</option>
                  <option value="30">30 {t("ik.questionsWord", "questions")}</option>
                  <option value={String(N)}>{N} {t("ik.questionsWord", "questions")}</option>
                  <option value={String(QUESTIONS.length)}>{t("ik.allAvailable", "All available questions")}</option>
                </select>
                <button className="btn" id="exam-start" onClick={startExam}>{t("ik.createSession", "Create new session")}</button>
              </div>
              <div id="exam-status" className="info-message">
                {session.length ? (
                  <>
                    <b>{examGraded ? <><span className="score">{examResult} / {session.length}</span> {t("ik.correctWord", "correct")}</> : t("ik.inProgress", "Session in progress")}</b>
                    <div className="tiny">
                      {examDone} {t("ik.of", "of")} {session.length} {t("ik.answered", "answered")} · {session.filter((q) => q.multi).length} {t("ik.multiSelect", "multi-select")} · {session.filter((q) => !q.multi).length} {t("ik.singleAnswer", "single-answer")}
                      {examGraded ? " · " + t("ik.exactMatch", "Exact-match scoring for multi-select") : ""}
                    </div>
                  </>
                ) : (
                  t("ik.chooseSettings", "Choose your exam settings and create a session. Questions are shuffled, and answers are hidden until grading.")
                )}
              </div>
            </div>
            <div id="exam-display" className="exam-list">
              {session.length ? (
                <>
                  <div className="test-nav">
                    <div className="tiny">
                      {t("ik.pageWord", "Page")} {examPage + 1} {t("ik.of", "of")} {lastPage + 1} · {t("ik.questionsWordCap", "Questions")} {examPage * per + 1}–{Math.min((examPage + 1) * per, session.length)}
                    </div>
                    <div className="buttons">{pager("top")}</div>
                  </div>
                  <div id="exam-questions">{session.slice(examPage * per, (examPage + 1) * per).map((q, i) => questionBlock(q, examPage * per + i + 1, "exam", examGraded))}</div>
                  <div className="test-nav">
                    <div className="buttons">{pager("bottom")}</div>
                    <div className="buttons">
                      <button className="btn" id="exam-grade" disabled={examGraded} onClick={() => setExamGraded(true)}>{t("ik.gradeSession", "Grade session")}</button>
                      <button className="btn grey" id="exam-download" disabled={!examGraded} onClick={downloadReport}>{t("ik.exportReport", "Export score report")}</button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </section>

          <section className={pageCls("matrix")} id="matrix">
            <div className="panel">
              <span className="label">{N} {t("ik.sourceMapped", "source mapped concepts")}</span>
              <h2>{t("ik.matrixTitle", "Cross-chapter coverage matrix")}</h2>
              <p className="tiny">{t("ik.matrixHint", "The three columns show where the Phase 2 topic mapping found supporting discussion. Blank means not directly mapped in that chapter; it does not mean a topic can never inform another chapter.")}</p>
              <div style={{ display: "flex", gap: 9, flexWrap: "wrap", margin: "15px 0" }}>
                <input id="matrix-search" className="field" type="search" placeholder={t("ik.matrixSearch", "Search topic, pages or keywords")} style={{ maxWidth: 460 }} value={matrixSearch} onChange={(e) => setMatrixSearch(e.target.value)} />
                <select id="matrix-cat" className="field" style={{ maxWidth: 220 }} value={matrixCat} onChange={(e) => setMatrixCat(e.target.value)}>
                  <option value="all">{t("ik.allCategories", "All categories")}</option>
                  {catOptions}
                </select>
                <select id="matrix-cover" className="field" style={{ maxWidth: 205 }} value={matrixCover} onChange={(e) => setMatrixCover(e.target.value)}>
                  <option value="all">{t("ik.anyCoverage", "Any coverage")}</option>
                  <option value="123">{t("ik.all3", "All 3 chapters")}</option>
                  <option value="12">{t("ik.ch12", "Chapters 1 + 2")}</option>
                  <option value="13">{t("ik.ch13", "Chapters 1 + 3")}</option>
                  <option value="23">{t("ik.ch23", "Chapters 2 + 3")}</option>
                </select>
                <button className="btn grey" id="matrix-export" onClick={exportMatrix}>{t("ik.exportMatrix", "Export matrix CSV")}</button>
              </div>
              <div className="tiny" id="matrix-count">{matrixRows.length} {t("ik.of", "of")} {N} {t("ik.mappedConnections", "mapped topic connections")}</div>
              <div style={{ overflow: "auto", maxHeight: 600 }}>
                <table className="matrix">
                  <thead>
                    <tr><th>{t("ik.thTopic", "Topic")}</th><th>{t("ik.thType", "Type")}</th><th>{t("ik.thCh1", "Ch 1")}</th><th>{t("ik.thCh2", "Ch 2")}</th><th>{t("ik.thCh3", "Ch 3")}</th></tr>
                  </thead>
                  <tbody id="matrix-body">
                    {matrixRows.map((r) => (
                      <tr key={r.id}>
                        <td><button data-matrix={r.id} onClick={() => openLesson(r.id)}>{r.id} · {r.title}</button></td>
                        <td>{r.type}</td>
                        {[1, 2, 3].map((ch) => (
                          <td key={ch}>
                            {r.pages[String(ch)] ? (
                              <>
                                <span className="dot">✓</span> <span className="tiny">{r.pages[String(ch)]}</span>
                              </>
                            ) : (
                              <span className="nodot">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className={pageCls("index")} id="index">
            <div className="panel">
              <span className="label">{t("ik.officialNav", "Official study-guide navigation")}</span>
              <h2>{t("ik.indexTitle", "Chapter source-heading index")}</h2>
              <p className="tiny">{INDEX.length} {t("ik.indexHint", "indexed headings and case labels from the uploaded guide. Printed page numbers restart within each course module; they are not DOCX viewer pages.")}</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                <input type="search" className="field" id="index-search" style={{ maxWidth: 460 }} placeholder={t("ik.indexSearch", "Search source headings and case examples")} value={indexSearch} onChange={(e) => setIndexSearch(e.target.value)} />
                <select id="index-chapter" className="field" style={{ maxWidth: 185 }} value={indexChapter} onChange={(e) => setIndexChapter(e.target.value)}>
                  <option value="all">{t("ik.allChapters", "All chapters")}</option>
                  <option value="1">{t("ik.chapter1", "Chapter 1")}</option>
                  <option value="2">{t("ik.chapter2", "Chapter 2")}</option>
                  <option value="3">{t("ik.chapter3", "Chapter 3")}</option>
                </select>
              </div>
              <div className="tiny" id="index-count">{indexMatches.length} {t("ik.sourceHeadings", "source headings and case labels")}</div>
              <div className="index-grid" id="index-list">
                {[1, 2, 3]
                  .filter((n) => indexChapter === "all" || indexChapter === String(n))
                  .map((n) => {
                    const items = indexMatches.filter((x) => x.chapter === n);
                    return (
                      <div className="index-card" key={n}>
                        <h3>{t("ik.chapterCap", "Chapter")} {n} <span className="subtle">({items.length})</span></h3>
                        {items.length ? (
                          items.map((x, i) => (
                            <div className="index-entry" key={i}>
                              <b>p. {x.page}</b>
                              <span>{String(x.title).replace(/^\d+\s+/, "")}</span>
                            </div>
                          ))
                        ) : (
                          <div className="noresults">{t("ik.noMatches", "No matches")}</div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </section>
        </main>
        <footer className="foot wrap">{t("ik.footer", "Prepared as an original personal study aid using only the uploaded CAFS Study Guide v1.03. Mapping, connections, scenarios and questions are editorial; not affiliated with or endorsed by ACAMS. The compiled document includes an embedded Chapter 1 module labelled version 1.02. No external data or libraries are loaded.")}</footer>
        <button className="floating-top no-print" id="scroll-top" aria-label="Back to top" onClick={() => document.querySelector(".cafs22-context")?.scrollIntoView({ block: "start", behavior: "smooth" })}>↑</button>
      </div>
    </ModuleFrame>
  );
}
