"use client";

import { useRef, useState } from "react";
import { useBreadcrumb, useStudioData, useT } from "@/lib/studio/StudioProvider";

const CATEGORIES = ["all", "Core numbers", "Names & aliases", "Case figures"];
const DOMAIN_TABS: [string, string][] = [
  ["all", "All Domains"],
  ["1", "Domain 1"],
  ["2", "Domain 2"],
  ["3", "Domain 3"],
];

export function NamesNumbersPage() {
  const t = useT();
  const { studyFacts } = useStudioData();
  const [domain, setDomain] = useState("all");
  const [kind, setKind] = useState("all");
  const [search, setSearch] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  useBreadcrumb(t("namesNumbers.breadcrumb", "Key Terms, Figures & Formulas"));

  const term = search.trim().toLowerCase();
  const rows = studyFacts
    .map((f, index) => ({ f, index }))
    .filter(
      ({ f }) =>
        (domain === "all" || String(f.domain) === domain) &&
        (kind === "all" || f.kind === kind) &&
        (term === "" || [f.name, f.short, f.detail, f.note].join(" ").toLowerCase().includes(term)),
    );

  const setAll = (open: boolean) => listRef.current?.querySelectorAll("details").forEach((d) => (d.open = open));

  return (
    <div className="v9-view">
      <div className="v9-header">
        <div>
          <div className="coach-eyebrow">{t("namesNumbers.eyebrow", "KEY TERMS, FIGURES & FORMULAS")}</div>
          <h1>{t("namesNumbers.title", "Key Terms, Figures & Formulas")}</h1>
          <p>
            {t(
              "namesNumbers.intro",
              "Important figures, frameworks, alternate names and abbreviations from your study materials. Reveal the answer to self-test, then read the short context so you know when it applies.",
            )}
          </p>
        </div>
        <div className="v9-pill">
          {studyFacts.length} {t("namesNumbers.pill", "exam-focus entries")}
        </div>
      </div>
      <div className="v9-toolbar v9-filters">
        <div className="v9-tabs">
          {DOMAIN_TABS.map(([id, label]) => (
            <button key={id} className={`v9-tab ${domain === id ? "is-active" : ""}`} data-v9-domain={id} onClick={() => setDomain(id)}>
              {label}
            </button>
          ))}
        </div>
        <select id="v9Kind" className="text-input" aria-label="Fact category" value={kind} onChange={(ev) => setKind(ev.target.value)}>
          {CATEGORIES.map((x) => (
            <option key={x} value={x}>
              {x === "all" ? t("namesNumbers.allCategories", "All categories") : x}
            </option>
          ))}
        </select>
        <input
          id="v9Search"
          className="text-input"
          type="search"
          placeholder={t("namesNumbers.search", "Search case, law, formula, acronym…")}
          value={search}
          aria-label="Search names and numbers"
          onChange={(ev) => setSearch(ev.target.value)}
        />
        <button className="btn" type="button" data-v9-reveal="1" onClick={() => setAll(true)}>
          {t("namesNumbers.reveal", "Reveal all")}
        </button>
        <button className="btn" type="button" data-v9-hide="1" onClick={() => setAll(false)}>
          {t("namesNumbers.hide", "Hide all")}
        </button>
      </div>
      <div className="v9-list-summary">
        Showing <b id="v9Showing">{rows.length}</b> entries · each card includes the exact distinction to remember.{" "}
        <span className="v9-sourcehint">{t("namesNumbers.sourcehint", "Source-specific and historical values are identified.")}</span>
      </div>
      <div className="v9-facts" id="v9Facts" ref={listRef}>
        {rows.map(({ f, index }) => (
          <details className="v9-fact" key={index} data-v9-search={(f.name + " " + f.short + " " + f.detail + " " + f.note).toLowerCase()}>
            <summary>
              <span className={`v9-fact-domain v9-domain-${f.domain}`}>D{f.domain}</span>
              <span className="v9-fact-title">
                {f.name}
                <small>{f.kind} · Tap to reveal</small>
              </span>
              <span className="v9-chevron">⌄</span>
            </summary>
            <div className="v9-answer">
              <strong>{f.short}</strong>
              <p>{f.detail}</p>
              {f.note ? <p className="v9-caution">{f.note}</p> : null}
              <small>{f.source}</small>
            </div>
          </details>
        ))}
      </div>
      <div className="v9-below">
        <strong>{t("namesNumbers.rule.label", "Study rule:")}</strong>{" "}
        {t(
          "namesNumbers.rule.text",
          "Learn definitions and decision sequences first. Memorise historical case amounts only after you can explain the underlying fraud weakness or investigative lesson.",
        )}
      </div>
    </div>
  );
}
