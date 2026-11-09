"use client";

import { useState } from "react";
import { queryParam } from "@/components/studio/library/useQueryInit";
import { ModuleTabs, flagDomain, uniq } from "@/components/studio/library/shared";
import { useBreadcrumb, useStudioData, useT } from "@/lib/studio/StudioProvider";
import { useStoredJSON } from "@/lib/studio/store";
import type { Rec } from "@/lib/studio/types";

const FLAG_KEY = "cafs_flags_review_v1";
const NONE: Record<string, boolean> = {};
const PAGE = 45;

function csvDownload(name: string, rows: Rec[]) {
  if (!rows.length) return;
  const cols = ["Module", "Fraud type", "Category", "Indicator class", "Indicator", "Interpretation", "Source section", "Guide page"];
  const val = (s: unknown) => '"' + String(s ?? "").replace(/"/g, '""') + '"';
  const raw =
    "﻿" +
    cols.map(val).join(",") +
    "\r\n" +
    rows
      .map((x) => [x.domain, x.fraud_type, x.category, x.indicator_class, x.indicator, x.interpretation, x.source_section, x.source_page].map(val).join(","))
      .join("\r\n");
  const u = URL.createObjectURL(new Blob([raw], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}

function Options({ items, empty }: { items: string[]; empty: string }) {
  return (
    <>
      <option value="">{empty}</option>
      {items.map((x) => (
        <option key={x} value={x}>
          {x}
        </option>
      ))}
    </>
  );
}

/** Deep links: ?module=2, or ?id=FR-010 (opens the indicator's module searching for it). */
export function RedFlagsPage() {
  useBreadcrumb("Fraud Red Flags");
  const t = useT();
  const { redFlags: RED_FLAGS } = useStudioData();
  const [reviewed, setReviewed] = useStoredJSON<Record<string, boolean>>(FLAG_KEY, NONE);
  const [init] = useState(() => {
    const hit = RED_FLAGS.find((x: Rec) => x.id === (queryParam("flag") || queryParam("id")));
    return hit ? { module: flagDomain(hit), search: String(hit.indicator) } : { module: Number(queryParam("module")) || 0, search: "" };
  });
  const [flagsModule, setFlagsModule] = useState(init.module);
  const [flagSearch, setFlagSearch] = useState(init.search);
  const [flagType, setFlagType] = useState("");
  const [flagCategory, setFlagCategory] = useState("");
  const [flagKind, setFlagKind] = useState("");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [flagLimit, setFlagLimit] = useState(PAGE);

  const inModule = (x: Rec) => !flagsModule || flagDomain(x) === flagsModule;
  const list = RED_FLAGS.filter(
    (x: Rec) =>
      inModule(x) &&
      (!flagType || x.fraud_type === flagType) &&
      (!flagCategory || x.category === flagCategory) &&
      (!flagKind || x.indicator_class === flagKind) &&
      (!onlyUnread || !reviewed[x.id]) &&
      (!flagSearch || [x.fraud_type, x.category, x.indicator, x.source_section, x.interpretation].join(" ").toLowerCase().includes(flagSearch.toLowerCase())),
  );
  const typeOpts = uniq(RED_FLAGS.filter(inModule).map((x: Rec) => x.fraud_type));
  const catOpts = uniq(RED_FLAGS.filter((x: Rec) => inModule(x) && (!flagType || x.fraud_type === flagType)).map((x: Rec) => x.category));
  const kindOpts = uniq(RED_FLAGS.map((x: Rec) => x.indicator_class));
  const seen = RED_FLAGS.filter((x: Rec) => reviewed[x.id]).length;

  return (
    <>
      <div className="page-intro">
        <div className="eyebrow muted">{t("redFlags.eyebrow", "Fraud indicators · Study Guide v1.03")}</div>
        <h1>{t("redFlags.title", "Fraud Red Flags & Indicators")}</h1>
        <p>
          All {RED_FLAGS.length} study-guide-derived indicators, preserved with source references and separated into explicit warning signs, fraud
          patterns, case indicators, control vulnerabilities and mechanisms.
        </p>
      </div>
      <ModuleTabs
        selected={flagsModule}
        all
        onSelect={(n) => {
          setFlagsModule(n);
          setFlagType("");
          setFlagCategory("");
          setFlagLimit(PAGE);
        }}
      />
      <div className="v14-metrics">
        <div className="v14-metric">
          <b>{RED_FLAGS.length}</b>
          <small>{t("redFlags.metricSource", "Source-derived indicators")}</small>
        </div>
        <div className="v14-metric">
          <b>{list.length}</b>
          <small>{t("redFlags.metricMatching", "Matching filters")}</small>
        </div>
        <div className="v14-metric">
          <b>{seen}</b>
          <small>{t("redFlags.metricReviewed", "Reviewed")}</small>
        </div>
        <div className="v14-metric">
          <b>{uniq(list.map((x: Rec) => x.fraud_type)).length}</b>
          <small>{t("redFlags.metricCategories", "Matching fraud categories")}</small>
        </div>
      </div>
      <div className="v14-filterbox">
        <div className="v14-filtergrid">
          <label>
            {t("redFlags.search", "Search")}
            <input
              className="text-input"
              id="v14-flag-search"
              placeholder={t("redFlags.searchPlaceholder", "e.g., vendor, takeover, device")}
              value={flagSearch}
              onChange={(e) => {
                setFlagSearch(e.target.value);
                setFlagLimit(PAGE);
              }}
            />
          </label>
          <label>
            {t("redFlags.fraudType", "Fraud type")}
            <select
              id="v14-flag-type"
              value={flagType}
              onChange={(e) => {
                setFlagType(e.target.value);
                setFlagCategory("");
                setFlagLimit(PAGE);
              }}
            >
              <Options items={typeOpts} empty={t("redFlags.allTypes", "All fraud types")} />
            </select>
          </label>
          <label>
            {t("redFlags.fraudCategory", "Fraud category")}
            <select
              id="v14-flag-cat"
              value={flagCategory}
              onChange={(e) => {
                setFlagCategory(e.target.value);
                setFlagLimit(PAGE);
              }}
            >
              <Options items={catOpts} empty={t("redFlags.allCategories", "All categories")} />
            </select>
          </label>
          <label>
            {t("redFlags.indicatorClass", "Indicator class")}
            <select
              id="v14-flag-kind"
              value={flagKind}
              onChange={(e) => {
                setFlagKind(e.target.value);
                setFlagLimit(PAGE);
              }}
            >
              <Options items={kindOpts} empty={t("redFlags.allClasses", "All indicator classes")} />
            </select>
          </label>
        </div>
        <div className="v14-filterfoot">
          <label className="v14-toggle">
            <input
              type="checkbox"
              id="v14-unread"
              checked={onlyUnread}
              onChange={(e) => {
                setOnlyUnread(e.target.checked);
                setFlagLimit(PAGE);
              }}
            />{" "}
            {t("redFlags.unreadOnly", "Unreviewed only")}
          </label>
          <button
            className="btn btn-sm"
            onClick={() => {
              setFlagSearch("");
              setFlagType("");
              setFlagCategory("");
              setFlagKind("");
              setOnlyUnread(false);
              setFlagLimit(PAGE);
            }}
          >
            {t("redFlags.clear", "Clear filters")}
          </button>
          <button className="btn btn-sm" onClick={() => csvDownload("CAFS_Fraud_Indicators_Module_Filter.csv", list)}>
            {t("redFlags.exportCsv", "Export filtered CSV")}
          </button>
          <span className="muted small">{t("redFlags.disclaimer", "A signal alone does not prove fraud.")}</span>
        </div>
      </div>
      <div className="v14-flaggrid">
        {list.length ? (
          list.slice(0, flagLimit).map((x: Rec) => (
            <article key={x.id} className={`v14-indicator ${reviewed[x.id] ? "reviewed" : ""}`}>
              <div className="v14-ind-top">
                <span className="v14-tag">{x.indicator_class}</span>
                <small>{x.id}</small>
              </div>
              <h3>{x.indicator}</h3>
              <div className="v14-field">
                <strong>{x.fraud_type}</strong> · {x.category}
              </div>
              <p>{x.interpretation}</p>
              <div className="v14-source">{x.source}</div>
              <label className="v14-check">
                <input type="checkbox" checked={!!reviewed[x.id]} onChange={(e) => setReviewed((r) => ({ ...r, [x.id]: e.target.checked }))} />{" "}
                {t("redFlags.markReviewed", "Mark reviewed")}
              </label>
            </article>
          ))
        ) : (
          <p className="muted">{t("redFlags.none", "No indicators match these filters.")}</p>
        )}
      </div>
      {list.length > flagLimit ? (
        <div className="v14-load">
          <button className="btn" onClick={() => setFlagLimit((n) => n + 80)}>
            Show more ({list.length - flagLimit} remaining)
          </button>
        </div>
      ) : null}
    </>
  );
}
