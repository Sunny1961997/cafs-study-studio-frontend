# CAFS Study Studio — Laravel endpoints

The frontend loads studio content and learner state from these 26 endpoints (24 content + 2 state).
All require `Authorization: Bearer <token>` (the same token returned by `/api/login`).
Until Laravel serves them, the frontend uses `public/data/*.json` and `app/api/studio/state/route.ts`.

## Switching the frontend to Laravel

`.env.local` (restart `npm run dev` after):

```
NEXT_PUBLIC_STUDIO_DATA_URL=http://localhost:8000/api/studio/data
NEXT_PUBLIC_STUDIO_STATE_URL=http://localhost:8000/api/studio/state
```

CORS: allow origin `http://localhost:3000` and the `Authorization` header for `/api/studio/*` (GET, PUT).

## A. Content (read-only) — 24 endpoints

`GET /api/studio/data/{key}.json` → `200 application/json`, body is the raw value (no wrapper). No input besides the token.
A missing or failing key makes the frontend fall back to the copy embedded in the HTML, so endpoints can be added one at a time.

| # | Endpoint | Output | Item shape |
|---|----------|--------|------------|
| 1 | `/data/bank.json` | array (580) | `{id, module, chapter, stem, options[string], correct[int], explanation, kind, selectionCount, source, reviewStatus, flags[], approvedForScoredExams, sourceFile}` |
| 2 | `/data/exams.json` | array (10) | `{id, type("chapter"\|"mock"), chapter, title, short, name, subtitle, questions[{…}], distribution[int], track, level, description}` — each exam has 100 questions; ids: `chapter-1..3`, `mock-1..3`, `mock-07`, `mock-09`, `mock-10`, `mock-11` |
| 3 | `/data/kit.json` | object | `{laws[{…}], typologies[{…}], chapters[{…}], flashcards[{…}]}` |
| 4 | `/data/handbook.json` | array (3) | `{id, title, intro, highlights[string], sections[{…}]}` |
| 5 | `/data/cases.json` | array (39) | `{id, chapter, title, page, kind, topic, summary, signal, lesson, question, answer}` |
| 6 | `/data/summaries.json` | array (3) | `{chapter, title, topics[{id, title, summary, …}]}` |
| 7 | `/data/redFlags.json` | array (319) | `{id, fraud_type, category, domain, indicator_class, indicator, interpretation, source_section, source_page, source}` |
| 8 | `/data/studyFacts.json` | array (89) | `{domain, kind, name, short, detail, source, note}` |
| 9 | `/data/studySheets.json` | array (4) | `{id, name, title, subtitle, accent, items[[string]]}` |
| 10 | `/data/tasks.json` | array (14) | `{id, day, name, desc}` |
| 11 | `/data/traps.json` | array (12) | `string` |
| 12 | `/data/typeSpec.json` | array (10) | `string` |
| 13 | `/data/lawSpec.json` | array (8) | `string` |
| 14 | `/data/lawsList.json` | array (19) | `{name, abbr, jurisdiction, priority, location, focus, exam, trap}` |
| 15 | `/data/lawsQuiz.json` | array (12) | `{q, options[string], answer(int index), why}` |
| 16 | `/data/ikData.json` | object | `{rows[{…}] (54), index[{…}], questions[{…}] (120), catmeta{category:{…}}}` |
| 17 | `/data/ikChapters.json` | object | `{"1": string, "2": string, "3": string}` |
| 18 | `/data/copy.json` | array of string (91) | Description paragraphs of the main studio, in page order |
| 19 | `/data/copyLaws.json` | array of string (6) | Description paragraphs of the Fraud Laws module |
| 20 | `/data/copyIk.json` | array of string (10) | Description paragraphs of the Integrated Knowledge module |
| 21 | `/data/ui.json` | array of string (455) | UI text of the main studio: nav labels, headings, buttons, labels, table headers, stat captions |
| 22 | `/data/uiLaws.json` | array of string (43) | UI text of the Fraud Laws module |
| 23 | `/data/uiIk.json` | array of string (104) | UI text of the Integrated Knowledge module |
| 24 | `/data/tpl.json` | array of string (8) | Question-building templates, e.g. "Identify the fraud concept described: ", " (Select TWO.)" |

**Text endpoints (`copy*`, `ui*`, `tpl`):** each array is positional and holds each distinct string once, in order of first appearance. Item *i* replaces item *i* everywhere it occurs in that document (so "CAFS Study Studio" is edited once and changes in every place). Keep the same length and order and edit only the text; quotes, backticks and `${` are escaped automatically, other HTML such as `<strong>` inside a paragraph is kept as written. Strings with template placeholders (`${…}`) are built in code and are not in the lists. Regenerate all 24 files from a new HTML with `npm run studio:extract -- "<path to html>"`.

Counts and editorial figures in the text ("580 questions", "54 topics", "117 rewritten questions", "400 imported practice questions" …) are not read from these lists: they are recalculated from the content arrays (bank, exams, redFlags, lawsList, ikData).

The exact JSON for every key is in `public/data/<key>.json` — return those files' contents unchanged and the studio renders identically.
Counts shown in the UI ("580 questions", "54 topics", "19 laws" …) are derived from these arrays, so adding/removing items updates the text automatically.

Suggested Laravel (store each file as a row/JSON column or read from `storage/app/studio/`):

```php
Route::middleware('auth:sanctum')->prefix('studio')->group(function () {
    Route::get('data/{key}.json', [StudioContentController::class, 'show'])
        ->where('key', 'bank|exams|kit|handbook|cases|summaries|redFlags|studyFacts|studySheets|tasks|traps|typeSpec|lawSpec|lawsList|lawsQuiz|ikData|ikChapters|copy|copyLaws|copyIk|ui|uiLaws|uiIk|tpl');
    Route::get('state', [StudioStateController::class, 'index']);
    Route::put('state', [StudioStateController::class, 'update']);
});
```

## B. Learner state (read/write) — 2 endpoints

Everything the learner does (answers, flags, timer, exam sessions/history, drill results, saves, completed lessons, adaptive plan, theme) is stored as key → string pairs. The studio's `localStorage` is replaced by these.

### `GET /api/studio/state`
- Input: token only.
- Output `200`:
  ```json
  { "state": { "cafs_studio_theme": "dark", "cafs_studio_v4_draft_600": "{\"sessions\":…}" } }
  ```
  Values are opaque strings (usually JSON text); return them exactly as stored. `{ "state": {} }` for a new learner.
- `401 {"message":"Unauthenticated."}` without a valid token.

### `PUT /api/studio/state`
- Input (JSON):
  ```json
  { "set": { "cafs_studio_theme": "light", "cafs_studio_timer": null } }
  ```
  A string value upserts that key; `null` deletes it. Several keys may arrive in one request (debounced ~300 ms; also sent with `keepalive` on page close).
- Output `200 { "ok": true }`.
- `422 {"message":"Invalid payload."}` if `set` is missing or not an object.
- Validation: key matches `^cafs[-_a-zA-Z0-9]+$` (max 120 chars); value is a string (allow up to ~2 MB — the exam history key grows).
- Storage: one row per (user_id, key) with a `value` LONGTEXT column; scope strictly to the authenticated user.

Keys currently written by the studio: `cafs_studio_theme`, `cafs_v11_theme_init`, `cafs_studio_timer`, `cafs_studio_v4_draft_600`, `cafs_studio_v15_adaptive_learning`, `cafs_studio_v14_advanced_practice`, `cafs_studio_v13_summary_reviewed`, `cafs_study_studio_case_library_v12`, `cafs_flags_review_v1`, `cafs_exam_coach_v7`, `cafs_exam_sprint_final_v1`, `cafs_v5_personal_memory_a1`, `cafs_v103_chapter_{1,2,3}_saves_v1`, `cafs_v103_advanced_bank_saves_v1`, and (from the Integrated Knowledge module) `cafs-lessons-phase3-progress-v1`, `cafs-integration-saved-v1`.

## Not covered

Strings assembled with template placeholders (`${…}`) in the studio's JavaScript, and the UI layout/logic itself, stay in the HTML.
