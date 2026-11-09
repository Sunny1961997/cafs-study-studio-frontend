"use client";

import { Fragment, useState } from "react";
import { useBreadcrumb, useStudioData, useT } from "@/lib/studio/StudioProvider";

const NAMES = ["Fraud Risk Management", "Fraud Detection & Analytics", "Fraud Investigations"];
const OBJECTIVE_COUNTS = [37, 20, 24];
const WEIGHTS = [40, 30, 30];
const NOISE =
  /examination handbook:|CAFS Study Guide, Chapter|page references|printed Chapter|uploaded text extract|the mapping uses|I verified|20 examination objectives|37 objectives|24 objectives|For these five objectives|question weightings|priority symbols/i;

export function HandbookMapPage() {
  const t = useT();
  const { handbook } = useStudioData();
  const [chapter, setChapter] = useState(0);
  useBreadcrumb(t("handbookMap.breadcrumb", "Handbook Mapping"));

  const d = handbook[chapter];
  if (!d) return null;
  const sections: { title: string; rows: string[][] }[] = d.sections || [];
  const highlights: string[] = d.highlights || [];

  const filter = (value: string) => {
    const query = value.trim().toLowerCase();
    document.getElementById("mainContent")?.querySelectorAll<HTMLDetailsElement>(".hs-hb-section").forEach((section) => {
      let shown = 0;
      section.querySelectorAll<HTMLElement>("[data-hb-row]").forEach((row) => {
        const match = (row.textContent || "").toLowerCase().includes(query);
        row.hidden = !match;
        if (match) shown++;
      });
      const empty = section.querySelector<HTMLElement>(".hs-hb-empty");
      if (empty) empty.hidden = shown > 0;
      if (query && shown > 0) section.open = true;
    });
  };

  return (
    <Fragment key={chapter}>
      <div className="hs-hb-head">
        <div>
          <div className="hs-hb-eyebrow">{t("handbookMap.eyebrow", "Objective-to-study-guide reference")}</div>
          <h1>{t("handbookMap.title", "Handbook Mapping")}</h1>
          <p>
            {t(
              "handbookMap.intro",
              "Identify exactly what each examination objective covers, where to read it in the supplied study guide, and what you should memorise.",
            )}
          </p>
        </div>
      </div>
      <div className="hs-hb-tabs" role="tablist" aria-label="Handbook chapters">
        {handbook.map((x, i) => (
          <button type="button" key={x.id ?? i} className="hs-hb-tab" role="tab" aria-selected={chapter === i} data-hb-tab={i} onClick={() => setChapter(i)}>
            Chapter {i + 1}
          </button>
        ))}
      </div>
      <section className="hs-hb-panel">
        <h2>
          Chapter {chapter + 1}: {NAMES[chapter]}
        </h2>
        <div className="hs-hb-chapterbar">
          <span className="hs-hb-chip">{OBJECTIVE_COUNTS[chapter]} mapped objectives</span>
          <span className="hs-hb-chip">{WEIGHTS[chapter]}% domain weighting</span>
          <span className="hs-hb-chip">{sections.length} reference tables</span>
        </div>
        <p>
          {t(
            "handbookMap.priority",
            "Priority symbols are study recommendations from your handbook mapping, not official ACAMS topic weightings. Page references are the printed chapter-specific study-guide pages.",
          )}
        </p>
      </section>
      <section className="hs-hb-panel">
        <h2>{t("handbookMap.focus", "Memorisation focus")}</h2>
        <div className="hs-hb-notes">
          {highlights
            .filter((x) => x.length > 40 && !NOISE.test(x))
            .slice(0, 6)
            .map((x, i) => (
              <div key={i}>{x}</div>
            ))}
        </div>
      </section>
      <section className="hs-hb-panel">
        <h2>{t("handbookMap.objectives.title", "Examination objectives and reading map")}</h2>
        <p>
          {t(
            "handbookMap.objectives.text",
            "Expand a section to see the objective, the relevant study-guide pages, and what to memorise. Filter the rows by topic, objective number, or concept.",
          )}
        </p>
        <input
          id="hsHbSearch"
          className="text-input hs-hb-search"
          type="search"
          placeholder={`Search within Chapter ${chapter + 1}…`}
          aria-label="Search handbook objectives"
          onChange={(ev) => filter(ev.target.value)}
        />
      </section>
      {sections.map((section, ix) => (
        <details className="hs-hb-section" key={ix} open={ix === 0}>
          <summary>
            <span>{section.title}</span>
            <small>{section.rows.length - 1} items</small>
          </summary>
          <div className="hs-hb-scroll">
            <table className="hs-hb-table">
              <thead>
                <tr>
                  {section.rows[0].map((c, i) => (
                    <th key={i}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.rows.slice(1).map((r, ri) => (
                  <tr data-hb-row="" key={ri}>
                    {r.map((c, ci) => (
                      <td key={ci}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="hs-hb-empty" hidden>
              {t("handbookMap.empty", "No matching items in this section.")}
            </div>
          </div>
        </details>
      ))}
      <p className="hs-hb-foot">
        {t(
          "handbookMap.foot",
          "This learning reference combines the three supplied handbook mapping documents. It is an independent study aid and does not reproduce an official ACAMS question bank.",
        )}
      </p>
    </Fragment>
  );
}
