# Porting the studio to React

The studio used to be one 3.9 MB HTML file (`C:/Users/HP/Downloads/CAFS_Study_Studio_v22_Integrated.html`,
vanilla JS that builds screens with `innerHTML`). It is being rebuilt as real Next.js/React pages.
**The look and behaviour must stay identical** to the original, only the implementation changes.

Read `AGENTS.md` first: this is a newer Next.js than you know; check `node_modules/next/dist/docs/` before using an API.

## Where things are

| What | Where |
|---|---|
| Original page (reference, do not edit) | `C:/Users/HP/Downloads/CAFS_Study_Studio_v22_Integrated.html` (very long lines, use `sed -n 'N,Mp' file \| cut -c1-N`, `grep -n -o -E`) |
| Original running in the app (for comparison) | `http://localhost:3000/studio/legacy` |
| React studio | `http://localhost:3000/studio` (overview) and `/studio/<pageId>` |
| Studio CSS (all 15 original `<style>` blocks, same order) | `app/(studio)/studio/studio.css` – **use the original class names; do not write new CSS unless the original has none.** |
| Shell (sidebar, top bar, theme, text size) | `components/studio/Shell.tsx` |
| Page components (one stub per page) | `components/studio/pages/<Name>.tsx`, routed from `app/(studio)/studio/(app)/<id>/page.tsx` |
| Content hooks | `lib/studio/StudioProvider.tsx`: `useStudioData()`, `useT()`, `useBreadcrumb(text)` |
| Learner state (replaces localStorage) | `lib/studio/store.ts`: `useStoredJSON(key, fallback)`, `useStoredString(key)`, `getItem/setItem`; `lib/studio/db.ts`: `useDb()`, `useTimerMinutes()` |
| Assessment engine (pure) | `lib/studio/engine.ts` (`createSession`, `isCorrect`, `getStats`, `archiveChangedBanks`, …) |
| Types | `lib/studio/types.ts` |
| Icons | `<Icon name="book" />` from `lib/studio/Icon.tsx` |
| Nav | `lib/studio/nav.ts` |
| Data files served as JSON | `public/data/*.json` (see `docs/LARAVEL_ENDPOINTS.md`) |

Page ids: overview, examPrep, cheatSheets, namesNumbers, handbookMap, moduleHub, adaptivePath, chapterSummaries,
redFlags, caseStudies, memorize, laws, integratedKnowledge, typologies, chapters, sprints, advancedBank, mocks, library, insights.
Sub-screens (exam workspace, results, drills, quiz) are extra routes under `app/(studio)/studio/(app)/…` (e.g. `exam/[id]`).

## Rules

1. **Same DOM and class names as the original**, so `studio.css` styles it unchanged. Copy the markup structure from the
   original render functions (template strings) into JSX. The original is built in layers: a base script plus later
   scripts (v12 … v22) that monkey-patch it. The **final rendered result** is what counts; check the live legacy page.
2. **Everything is dynamic.** Content comes from `useStudioData()` (never import JSON files or hardcode questions/lists).
   Counts ("580 questions", "54 topics") are computed from the data. Learner state comes from the store hooks with the
   **same storage keys** as the original (existing progress must keep working). Every button/submit that changed
   localStorage in the original must write through the store (it syncs to the API).
3. **Labels go through `t()`**: headings, descriptions, button text, notices, empty-states:
   `const t = useT(); … {t("mocks.title", "Fraud Mock Examination Centre")}`. Key = `<page>.<name>`, second argument is the exact
   original text. `t(key, fallback)` must be called with **string literals** (a script reads them):
   run `npm run studio:labels` to regenerate `public/data/labels.json`. Strings built from data (`${count} questions`) stay in code.
4. No `any` leaks beyond `lib/studio/types.ts` (`Rec`), no `dangerouslySetInnerHTML` for plain text. Use it only when a data field is
   genuinely HTML (the original did `innerHTML` for it).
5. Client components (`"use client"`) for anything interactive. Keep each page's helpers in its own files
   (`components/studio/<area>/…`) – **do not edit files that belong to someone else.** If you need a change in a shared file
   (`lib/studio/*`, `Shell.tsx`, `nav.ts`), make a small additive edit only (new export / optional prop) and mention it in your report.
6. Keyboard shortcuts, timers, confirm dialogs, downloads (CSV/JSON backup), modals etc. must behave as in the original.
7. `npx tsc --noEmit` and `npx eslint app components lib scripts` must be clean for your files.

## Verifying (required)

Compare your page with the original in the browser (a Chrome tab is already logged in):

1. Open tab A `http://localhost:3000/studio/legacy`, tab B `http://localhost:3000/studio/<page>`.
2. Paste `docs/studio-compare.js` into the javascript tool in each tab. In A: `await legacySnap("<pageId>")`; in B: `reactSnap()`.
   Compare `text` (visible text must match, except values that depend on time/random order) and `classes`
   (element/class counts). Fix differences. Also compare screenshots at the same viewport.
3. Exercise every interaction (filters, tabs, selecting answers, submit, reset, search …) in both and compare results.
4. Check the browser console for errors (`read_console_messages`).

## Test data hygiene (important)

The browser is signed in as the real account and the state API stores your test clicks. **Before testing, snapshot the state**
(`fetch('/api/studio/state',{headers:{Authorization:'Bearer '+localStorage.getItem('cafs_token')}}).then(r=>r.json())`) and **after testing
restore it**: `PUT /api/studio/state` with `{set:{key: originalValueOrNull}}` for every key you changed. Do not leave exam attempts,
saved items or drafts behind. Never modify `.studio-state/` files directly, never touch the backend project.

## Done means

Every interaction of your pages works and matches the original; labels via `t()`; data via hooks; tsc/eslint clean; test state
restored; short report listing files created, shared files touched, and anything you could not match.
