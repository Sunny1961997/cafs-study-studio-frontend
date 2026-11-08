"use client";

// Loads everything a studio page needs (learner state, content datasets, UI labels) and
// exposes it through hooks. Pages render nothing until it is ready.

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getToken } from "@/lib/api";
import { archiveChangedBanks, importLegacySaves, DB_KEY, TIMER_KEY, DEFAULT_TIMER_MINUTES } from "@/lib/studio/engine";
import { getItem, initStore, setItem } from "@/lib/studio/store";
import type { StudioContent } from "@/lib/studio/types";
import { fetchStudioData } from "@/lib/studioFetch";
import { parseDb } from "@/lib/studio/engine";

const DATA_URL = process.env.NEXT_PUBLIC_STUDIO_DATA_URL || "/data";

type Labels = Record<string, string>;

type Ctx = {
  data: StudioContent;
  /** Text for a UI label: served by /data/labels.json, falling back to the default in code. */
  t: (key: string, fallback: string) => string;
  breadcrumb: string | null;
  setBreadcrumb: (text: string | null) => void;
};

const StudioContext = createContext<Ctx | null>(null);

function toContent(raw: Awaited<ReturnType<typeof fetchStudioData>>): StudioContent {
  const list = (value: unknown) => (Array.isArray(value) ? value : []);
  const kit = (raw.kit ?? {}) as Partial<StudioContent["kit"]>;
  const ik = (raw.ikData ?? {}) as Partial<StudioContent["ikData"]>;
  return {
    bank: list(raw.bank),
    exams: list(raw.exams),
    kit: { laws: list(kit.laws), typologies: list(kit.typologies), chapters: list(kit.chapters), flashcards: list(kit.flashcards) },
    handbook: list(raw.handbook),
    cases: list(raw.cases),
    summaries: list(raw.summaries),
    redFlags: list(raw.redFlags),
    studyFacts: list(raw.studyFacts),
    studySheets: list(raw.studySheets),
    tasks: list(raw.tasks),
    traps: list(raw.traps),
    typeSpec: list(raw.typeSpec),
    lawSpec: list(raw.lawSpec),
    lawsList: list(raw.lawsList),
    lawsQuiz: list(raw.lawsQuiz),
    ikData: { rows: list(ik.rows), index: list(ik.index), questions: list(ik.questions), catmeta: ik.catmeta ?? {} },
    ikChapters: (raw.ikChapters ?? {}) as Record<string, string>,
    tpl: list(raw.tpl),
  };
}

async function loadLabels(): Promise<Labels> {
  try {
    const response = await fetch(`${DATA_URL}/labels.json`, { cache: "no-store" });
    return response.ok ? ((await response.json()) as Labels) : {};
  } catch {
    return {};
  }
}

export function StudioProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [content, setContent] = useState<StudioContent | null>(null);
  const [labels, setLabels] = useState<Labels>({});
  const [failed, setFailed] = useState("");
  const [breadcrumb, setBreadcrumb] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    let active = true;
    Promise.all([initStore(), fetchStudioData(), loadLabels()])
      .then(([, raw, loaded]) => {
        if (!active) return;
        const data = toContent(raw);
        // One-off clean-ups of attempts made against older question banks.
        const timer = Number(getItem(TIMER_KEY) ?? DEFAULT_TIMER_MINUTES) || 0;
        const db = parseDb(getItem(DB_KEY));
        const migrated = archiveChangedBanks(data.exams, importLegacySaves(db, getItem), timer);
        if (migrated !== db) setItem(DB_KEY, JSON.stringify(migrated));
        setLabels(loaded);
        setContent(data);
      })
      .catch(() => active && setFailed("The study studio data could not be loaded."));
    return () => {
      active = false;
    };
  }, [router]);

  const t = useCallback((key: string, fallback: string) => labels[key] ?? fallback, [labels]);
  const value = useMemo(
    () => (content ? { data: content, t, breadcrumb, setBreadcrumb } : null),
    [content, t, breadcrumb],
  );

  if (failed) return <p className="studio-loading">{failed}</p>;
  if (!value) return <p className="studio-loading">Opening your study studio…</p>;
  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

function useStudio(): Ctx {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("Studio hooks must be used inside <StudioProvider>.");
  return ctx;
}

/** All content datasets. */
export const useStudioData = () => useStudio().data;

/** Label lookup: `t("overview.title", "Fraud Learning Dashboard")`. */
export const useT = () => useStudio().t;

/** Sets the breadcrumb text of the page (cleared on unmount, then the nav label is used). */
export function useBreadcrumb(text: string | null) {
  const { setBreadcrumb } = useStudio();
  useEffect(() => {
    setBreadcrumb(text);
    return () => setBreadcrumb(null);
  }, [text, setBreadcrumb]);
}

export const useCrumb = () => useStudio().breadcrumb;
