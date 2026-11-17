"use client";

import { useMemo, useRef, useState } from "react";
import { ModuleFrame } from "@/components/studio/modules/ModuleFrame";
import "@/components/studio/modules/laws.css";
import { useBreadcrumb, useStudioData, useT } from "@/lib/studio/StudioProvider";

type Result = { fb: { ok: boolean; text: string }[]; score: string };

export function LawsPage() {
  const t = useT();
  const { lawsList: laws, lawsQuiz: questions } = useStudioData();
  const label = t("laws.label", "Fraud Laws · Interactive Exam Guide");
  useBreadcrumb(label);

  const [term, setTerm] = useState("");
  const [jur, setJur] = useState("");
  const [priority, setPriority] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [quizKey, setQuizKey] = useState(0);
  const cardsRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLDivElement>(null);

  const jurisdictions = useMemo(() => [...new Set(laws.map((x) => String(x.jurisdiction)))].sort(), [laws]);
  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    return laws.filter((x) => {
      const hay = Object.values(x).join(" ").toLowerCase();
      return (!q || hay.includes(q)) && (!jur || x.jurisdiction === jur) && (!priority || x.priority === priority);
    });
  }, [laws, term, jur, priority]);

  const toggleAll = () => {
    const next = !expanded;
    setExpanded(next);
    cardsRef.current?.querySelectorAll("details").forEach((d) => {
      d.open = next;
    });
  };

  const check = () => {
    let correct = 0;
    const fb = questions.map((q, qi) => {
      if (answers[qi] !== undefined && answers[qi] === q.answer) {
        correct++;
        return { ok: true, text: t("laws.correct", "Correct — ") + q.why };
      }
      return { ok: false, text: t("laws.review", "Review — ") + q.why };
    });
    setResult({ fb, score: `${t("laws.score", "Score:")} ${correct}/${questions.length} (${Math.round((correct / questions.length) * 100)}%)` });
    requestAnimationFrame(() => scoreRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  const reset = () => {
    setAnswers({});
    setResult(null);
    setQuizKey((k) => k + 1);
  };

  const matrix: [string, string][] = [
    [t("laws.m1.a", "SOX vs Regulation E"), t("laws.m1.b", "SOX = public-company governance and internal controls. Regulation E = unauthorized electronic transfers and consumer protection.")],
    [t("laws.m2.a", "GDPR vs FCRA"), t("laws.m2.b", "GDPR = broad EU personal-data lifecycle and privacy. FCRA = US consumer credit-reporting data and related rights.")],
    [t("laws.m3.a", "PSD2 vs UK PSR"), t("laws.m3.b", "PSD2 = EU payment-services directive. UK Payment Services Regulations = UK implementation with SCA, unauthorized-payment refunds, and Confirmation of Payee.")],
    [t("laws.m4.a", "Fraud Act vs ECCTA"), t("laws.m4.b", "Fraud Act = substantive fraud offences. ECCTA = organizational failure to prevent fraud benefiting the organization.")],
    [t("laws.m5.a", "PSR vs FSMA-based APP rules"), t("laws.m5.b", "PSR = payment security and unauthorized-transaction protection. FSMA = legal basis for APP scam reimbursement regimes.")],
    [t("laws.m6.a", "Law vs regulator"), t("laws.m6.b", "OLAF, CFPB, SEC, FTC, and the Payment Systems Regulator are bodies—not laws.")],
  ];
  const numbers: [string, string, string][] = [
    [t("laws.n1.num", "10 days"), t("laws.n1.title", "Reg E"), t("laws.n1.text", "Investigation closure without provisional credit.")],
    [t("laws.n2.num", "45–90 days"), t("laws.n2.title", "Reg E"), t("laws.n2.text", "With provisional credit, depending on criteria.")],
    [t("laws.n3.num", "£85,000"), t("laws.n3.title", "UK APP cap"), t("laws.n3.text", "Plus 50/50 PSP split and five-business-day reimbursement in most cases.")],
    [t("laws.n4.num", "CA$5,000"), t("laws.n4.title", "Canada threshold"), t("laws.n4.text", "Above: max 14 years. Below: max 2 years.")],
  ];

  return (
    <ModuleFrame
      label={label}
      tag={`${t("laws.tag", "REPLACEMENT MODULE")} · ${laws.length} ${t("laws.tagLaws", "LAWS")} / ${questions.length} ${t("laws.tagChecks", "EXAM CHECKS")}`}
      desc={`${t("laws.ctx1", "The previous Fraud Laws page has been replaced with the supplied Interactive Exam Guide. Review all")} ${laws.length} ${t("laws.ctx2", "laws, jurisdiction-specific comparisons, figures to remember, and its built-in law exam drill.")}`}
      tip={t("laws.tip", "This module is fully included in this HTML file and runs offline. Its own navigation, quiz responses, and learning progress are separate from the original Studio exam scores. To move saved progress from an earlier HTML file, use the Studio backup and restore controls.")}
    >
      <div className="cafs-laws">
        <header>
          <div className="wrap">
            <span className="badge">{t("laws.badge", "ACAMS CAFS • Study Guide v1.03")}</span>
            <h1>{t("laws.h1", "Fraud Laws: Interactive Exam Guide")}</h1>
            <div className="hero-grid">
              <div className="hero-card">
                <strong>{t("laws.scope", "Scope:")}</strong> {t("laws.scopeText", "every named legal instrument found in the study guide.")}
                <div className="note">
                  <strong>{t("laws.principle", "Master exam principle:")}</strong>{" "}
                  {t("laws.principleText", "there is no single universal global anti-fraud law. Requirements are jurisdiction-specific, so identify the jurisdiction, the protected interest, and the required response.")}
                </div>
              </div>
              <div className="hero-card">
                <div className="stat">{laws.length}</div>
                <div>{t("laws.instruments", "named legal instruments")}</div>
                <div style={{ marginTop: 10 }}>
                  <span className="badge">{t("laws.core", "9 Core")}</span> <span className="badge">{t("laws.important", "7 Important")}</span>{" "}
                  <span className="badge">{t("laws.contextual", "3 Contextual")}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="controls">
          <div className="wrap" style={{ paddingTop: 0, paddingBottom: 0 }}>
            <div className="control-grid">
              <input id="search" aria-label="Search laws" placeholder={t("laws.searchPlaceholder", "Search by law, acronym, topic, or exam clue…")} value={term} onChange={(e) => setTerm(e.target.value)} />
              <select id="jurisdiction" aria-label="Filter by jurisdiction" value={jur} onChange={(e) => setJur(e.target.value)}>
                <option value="">{t("laws.allJur", "All jurisdictions")}</option>
                {jurisdictions.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
              <select id="priority" aria-label="Filter by priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="">{t("laws.allPri", "All priorities")}</option>
                <option>Core</option>
                <option>Important</option>
                <option>Contextual</option>
              </select>
              <button className="secondary" id="expand" onClick={toggleAll}>
                {expanded ? t("laws.collapseAll", "Collapse all") : t("laws.expandAll", "Expand all")}
              </button>
            </div>
          </div>
        </div>

        <main className="wrap">
          <section>
            <h2>{t("laws.cardsTitle", "Law Cards")}</h2>
            <p style={{ color: "var(--muted)" }}>{t("laws.cardsHint", "Filter the cards, open a law, and study the exam hook and common trap.")}</p>
            <div id="cards" className="cards" ref={cardsRef} key={`${term}|${jur}|${priority}`}>
              {filtered.length ? (
                filtered.map((x, i) => (
                  <details className="law-card" key={i}>
                    <summary>
                      <div>
                        <div className="law-title">
                          {x.name} {x.abbr ? <span style={{ color: "var(--purple)" }}>{`(${x.abbr})`}</span> : null}
                        </div>
                        <div className="meta">
                          <span className="tag">{x.jurisdiction}</span>
                          <span className={`tag ${String(x.priority).toLowerCase()}`}>{x.priority}</span>
                        </div>
                      </div>
                      <span className="chev">+</span>
                    </summary>
                    <div className="content">
                      <h4>{t("laws.covers", "What it covers")}</h4>
                      <p>{x.focus}</p>
                      <h4>{t("laws.hook", "Exam hook")}</h4>
                      <p><strong>{x.exam}</strong></p>
                      <h4>{t("laws.trap", "Common trap")}</h4>
                      <p>{x.trap}</p>
                      <p className="source"><strong>{t("laws.location", "Study-guide location:")}</strong> {x.location}</p>
                    </div>
                  </details>
                ))
              ) : (
                <p>{t("laws.none", "No laws match the selected filters.")}</p>
              )}
            </div>
          </section>

          <section>
            <h2>{t("laws.matrixTitle", "High-Yield Comparison Matrix")}</h2>
            <table className="matrix">
              <thead>
                <tr><th>{t("laws.confusion", "Common confusion")}</th><th>{t("laws.distinction", "Correct distinction")}</th></tr>
              </thead>
              <tbody>
                {matrix.map(([a, b], i) => (
                  <tr key={i}><td><strong>{a}</strong></td><td>{b}</td></tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2>{t("laws.numbersTitle", "Numbers to Memorize")}</h2>
            <div className="numbers">
              {numbers.map(([num, title, text], i) => (
                <div className="num-card" key={i}><div className="num">{num}</div><strong>{title}</strong><p>{text}</p></div>
              ))}
            </div>
          </section>

          <section>
            <h2>{t("laws.drillTitle", "Exam Drill")}</h2>
            <div className="quiz">
              <div id="quiz" key={quizKey}>
                {questions.map((q, qi) => (
                  <div className="q" key={qi}>
                    <strong>{qi + 1}. {q.q}</strong>
                    {(q.options as string[]).map((o, oi) => (
                      <label className="option" key={oi}>
                        <input type="radio" name={`q${qi}`} value={oi} checked={answers[qi] === oi} onChange={() => setAnswers((a) => ({ ...a, [qi]: oi }))} /> {o}
                      </label>
                    ))}
                    <div className={result ? `feedback ${result.fb[qi].ok ? "ok" : "no"}` : "feedback"}>{result ? result.fb[qi].text : ""}</div>
                  </div>
                ))}
              </div>
              <div className="quiz-actions">
                <button id="check" onClick={check}>{t("laws.check", "Check answers")}</button>
                <button className="secondary" id="reset" onClick={reset}>{t("laws.reset", "Reset")}</button>
              </div>
              <div id="score" className="score" aria-live="polite" ref={scoreRef}>{result?.score ?? ""}</div>
            </div>
          </section>

          <div className="footer">{t("laws.footer", "Prepared from the ACAMS Certified Anti-Fraud Specialist Study Guide v1.03. This is a study summary, not legal advice.")}</div>
        </main>
      </div>
    </ModuleFrame>
  );
}
