"use client";

// Flashcard studio and practice-mock screens of the memorisation kit, plus the context the
// Memorize / Typologies (and, if wanted, Laws) pages use to start them.
//
//   <KitFlow home="typologies"> ...library markup, calls useKit().startFlash / startQuiz... </KitFlow>
//
// While a flashcard deck or quiz is active KitFlow renders it instead of its children.

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useStudioData, useBreadcrumb, useT } from "@/lib/studio/StudioProvider";
import { useStoredJSON } from "@/lib/studio/store";
import {
  EMPTY_MEMORY,
  SITEKEY,
  buildQuiz,
  cx,
  flashChoices,
  flashClue,
  flashList,
  getList,
  normalizeMemory,
  quizCorrect,
  rand,
  type FlashState,
  type KitData,
  type KitMemory,
  type KitSource,
  type QuizState,
} from "@/components/studio/kit/engine";

export type KitHome = "laws" | "typologies" | "memorize";

type KitCtx = {
  data: KitData;
  mem: KitMemory;
  updateMem: (fn: (m: KitMemory) => void) => void;
  startFlash: (source: KitSource, one?: string | null, m?: number, c?: number) => void;
  startQuiz: (source: KitSource, size?: number, m?: number, c?: number) => void;
};

const KitContext = createContext<KitCtx | null>(null);

export function useKit(): KitCtx {
  const ctx = useContext(KitContext);
  if (!ctx) throw new Error("useKit must be used inside <KitFlow>.");
  return ctx;
}

export function KitTop({ title, desc, breadcrumb }: { title: string; desc: string; breadcrumb: string }) {
  return (
    <>
      <div className="v5-kicker">CAFS STUDY STUDIO / {breadcrumb}</div>
      <h1>{title}</h1>
      <p className="v5-lede">{desc}</p>
    </>
  );
}

export function KitStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="v5-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

const scrollTop = () => {
  window.scrollTo({ top: 0, behavior: "instant" });
  document.getElementById("mainContent")?.scrollTo({ top: 0, behavior: "instant" });
};

export function KitFlow({ home, children }: { home: KitHome; children: ReactNode }) {
  const router = useRouter();
  const t = useT();
  const studio = useStudioData();
  const data: KitData = useMemo(
    () => ({
      laws: studio.kit.laws,
      typologies: studio.kit.typologies,
      chapters: studio.kit.chapters,
      flashcards: studio.kit.flashcards,
      lawSpec: studio.lawSpec,
      typeSpec: studio.typeSpec,
      tpl: studio.tpl,
    }),
    [studio],
  );
  const [stored, setStored] = useStoredJSON<Partial<KitMemory>>(SITEKEY, EMPTY_MEMORY);
  const mem = useMemo(() => normalizeMemory(stored), [stored]);
  const updateMem = useCallback(
    (fn: (m: KitMemory) => void) => {
      setStored((prev) => {
        const next = normalizeMemory(JSON.parse(JSON.stringify(prev ?? {})));
        fn(next);
        return next;
      });
    },
    [setStored],
  );

  const [flash, setFlash] = useState<FlashState | null>(null);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const view = quiz ? "kitquiz" : flash ? "flashcards" : "home";

  const crumb =
    view === "kitquiz"
      ? t("kit.crumbQuiz", "Specialized Mock")
      : view === "flashcards"
        ? t("kit.crumbFlash", "Flashcards")
        : home === "laws"
          ? t("kit.crumbLaws", "Fraud Laws")
          : home === "typologies"
            ? t("kit.crumbTypologies", "Fraud Typologies")
            : t("kit.crumbMemorize", "Memorisation Kit");
  useBreadcrumb(crumb);

  const startFlash = useCallback(
    (source: KitSource, one: string | null = null, m = 1, c = 1) => {
      let a = source === "memory" ? data.flashcards.filter((x) => x.module === m && x.chapter === c) : getList(data, source);
      if (one) a = a.filter((x) => x.id === one);
      setQuiz(null);
      setFlash({
        source,
        label: source === "memory" ? `Module ${m} · Chapter ${c}` : source === "laws" ? t("kit.labelLaws", "Fraud Laws") : t("kit.labelTypologies", "Fraud Typologies"),
        ids: a.map((x) => x.id),
        i: 0,
        flipped: false,
        mode: "challenge",
        choice: null,
      });
      scrollTop();
    },
    [data, t],
  );

  const startQuiz = useCallback(
    (source: KitSource, size = 20, m = 1, c = 1) => {
      setFlash(null);
      setQuiz(buildQuiz(data, source, size, m, c));
      scrollTop();
    },
    [data],
  );

  // Leaves the flashcard / quiz screen: back to the home view, or to another page when the deck came from it.
  const leave = useCallback(
    (target: KitHome) => {
      if (target === home) {
        setFlash(null);
        setQuiz(null);
        scrollTop();
      } else {
        router.push(`/studio/${target}`);
      }
    },
    [home, router],
  );

  const ctx = useMemo(() => ({ data, mem, updateMem, startFlash, startQuiz }), [data, mem, updateMem, startFlash, startQuiz]);

  return (
    <KitContext.Provider value={ctx}>
      {view === "home" && children}
      {view === "flashcards" && flash && <FlashView flash={flash} setFlash={setFlash} onLeave={leave} />}
      {view === "kitquiz" && quiz && <QuizView quiz={quiz} setQuiz={setQuiz} onLeave={leave} />}
    </KitContext.Provider>
  );
}

const sourceHome = (s: KitSource | undefined): KitHome => (s === "memory" ? "memorize" : s || "memorize");

function FlashView({
  flash,
  setFlash,
  onLeave,
}: {
  flash: FlashState;
  setFlash: (f: FlashState | ((p: FlashState | null) => FlashState | null)) => void;
  onLeave: (target: KitHome) => void;
}) {
  const t = useT();
  const { data, mem, updateMem } = useKit();
  const list = flashList(data, flash);
  if (!list.length) {
    return (
      <>
        <KitTop title={t("kit.flashEmptyTitle", "Flashcards")} desc={t("kit.flashEmptyDesc", "Choose a deck to start active recall.")} breadcrumb="FLASHCARDS" />
        <button className="btn btn-primary" onClick={() => onLeave("memorize")}>
          {t("kit.backToKit", "Back to Memorisation Kit")}
        </button>
      </>
    );
  }
  const i = Math.min(flash.i, list.length - 1);
  const x = list[i];
  const key: string = x.term || x.key;
  const detail = x.study || {};
  const answer: string = detail.meaning || x.definition || x.back;
  const mastered = list.filter((y) => mem.ratings[y.id] === 2).length;
  const choiceMode = flash.mode === "challenge";
  const opts = flashChoices(data, x, flash.source);
  const chosen = flash.choice;
  const answered = chosen !== null;
  const correct = chosen === x.id;
  const kind = flash.source === "memory" ? `DOMAIN ${x.module} · CHAPTER ${x.chapter}` : flash.source === "laws" ? "FRAUD LAWS" : "FRAUD TYPOLOGIES";
  const rate = mem.ratings[x.id] || 0;
  const showDeep = flash.flipped || (choiceMode && answered);
  const clue = flashClue(x);

  const move = (patch: Partial<FlashState>) => setFlash((f) => (f ? { ...f, ...patch } : f));
  const step = (d: number) => move({ i: (flash.i + d + flash.ids.length) % flash.ids.length, flipped: false, choice: null });
  const flip = () => move({ mode: "flip", flipped: !flash.flipped });
  const rateCard = (value: number) => {
    updateMem((m) => {
      m.ratings[flash.ids[flash.i]] = value;
    });
    step(1);
  };

  return (
    <>
      <KitTop
        title={t("kit.flashTitle", "Active Recall Studio")}
        desc={t(
          "kit.flashDesc",
          "Use a quick multiple-choice challenge or traditional flip cards. Every answer includes an explanation and a practical exam distinction.",
        )}
        breadcrumb="FLASHCARDS"
      />
      <div className={`v5-flash-wrap v6-flash-wrap v8-flash-area domain-${flash.source === "memory" ? x.module : flash.source === "laws" ? 4 : 5}`}>
        <div className="v5-flash-meta">
          <b>{flash.label}</b>
          <span>
            Card {i + 1}/{list.length} · {mastered} mastered
          </span>
        </div>
        <div className="v5-progress">
          <i style={{ width: `${((i + 1) / list.length) * 100}%` }} />
        </div>
        <div className="v8-flash-toolbar">
          <div className="v8-mode-switch">
            <button className={choiceMode ? "active" : ""} onClick={() => move({ mode: "challenge", flipped: false, choice: null })}>
              {t("kit.modeQuiz", "◈ Quiz me")}
            </button>
            <button className={!choiceMode ? "active" : ""} onClick={() => move({ mode: "flip", flipped: false, choice: null })}>
              {t("kit.modeFlip", "⇄ Flip card")}
            </button>
          </div>
          <span className={`v8-flash-status v8-status-${rate}`}>
            {rate === 2 ? t("kit.statusMastered", "✓ Mastered") : rate === 1 ? t("kit.statusReview", "↻ Review again") : t("kit.statusNew", "◌ Not reviewed")}
          </span>
        </div>
        {choiceMode ? (
          <article className="v8-question-challenge">
            <div className="v5-kicker">{kind} · KNOWLEDGE CHECK</div>
            <h2>{t("kit.challengeQuestion", "Which concept best matches this scenario or explanation?")}</h2>
            <p className="v8-question-clue">{clue}</p>
            <div className="v8-flash-choices">
              {opts.map((o, j) => (
                <button
                  key={o.id}
                  className={cx("v8-flash-option", chosen === o.id && "selected", answered && o.id === x.id && "correct", answered && chosen === o.id && !correct && "wrong")}
                  disabled={answered}
                  onClick={() => {
                    if (flash.choice == null) move({ choice: o.id });
                  }}
                >
                  <b>{"ABCD"[j]}</b>
                  <span>{o.title}</span>
                  {answered && o.id === x.id && <strong>✓</strong>}
                </button>
              ))}
            </div>
            {answered ? (
              <>
                <div className={`v8-choice-feedback ${correct ? "good" : "needs"}`}>
                  <b>{correct ? t("kit.correctRecall", "Correct: strong recall") : `${t("kit.notQuite", "Not quite. The correct concept is ")}${key}`}</b>
                  <p>{answer}</p>
                  {detail.distinction && (
                    <p>
                      <strong>{t("kit.examDistinctionLabel", "Exam distinction:")}</strong> {detail.distinction}
                    </p>
                  )}
                </div>
                <div className="v5-actions v5-center">
                  <button className="btn btn-primary" onClick={flip}>
                    {t("kit.readFull", "Read full explanation")}
                  </button>
                </div>
              </>
            ) : (
              <p className="v8-hint">{t("kit.pickOne", "Pick one answer to see the explanation. The answer is not shown until you choose.")}</p>
            )}
          </article>
        ) : (
          <button
            className={cx("v5-flash", "v6-flash-card", "v8-flip-card", flash.flipped && "flipped")}
            aria-label={flash.flipped ? "Hide flashcard answer" : "Reveal flashcard answer"}
            onClick={flip}
          >
            <span className="v5-kicker">
              {flash.flipped ? "ANSWER" : "RECALL PROMPT"} · {kind}
            </span>
            {flash.flipped ? (
              <>
                <span className="v6-flash-answer-title">{key}</span>
                <strong>{answer}</strong>
                <small>{t("kit.clickReturn", "Click to return to the question")}</small>
              </>
            ) : (
              <>
                <strong>{t("kit.flipPrompt", "Which key term or principle matches this description?")}</strong>
                <span className="v5-flash-question">{clue}</span>
                <small>{t("kit.thinkTap", "Think, then tap to reveal")}</small>
              </>
            )}
          </button>
        )}
        {showDeep && (
          <section className="v6-flash-deep v8-flash-deep">
            <div className="v6-flash-cols">
              <article>
                <h3>{t("kit.understand", "Understand it")}</h3>
                <p>{detail.context || answer}</p>
              </article>
              {detail.example && (
                <article>
                  <h3>{t("kit.practical", "In a practical case")}</h3>
                  <p>{detail.example}</p>
                </article>
              )}
            </div>
            {detail.distinction && (
              <div className="v6-flash-trap">
                <b>{t("kit.watchTrap", "Watch the exam trap")}</b>
                <p>{detail.distinction}</p>
              </div>
            )}
          </section>
        )}
        <div className="v5-actions v5-center">
          <button className="btn" onClick={() => step(-1)}>
            {t("kit.prev", "← Previous")}
          </button>
          {!choiceMode && (
            <button className="btn btn-primary" onClick={flip}>
              {flash.flipped ? t("kit.hideAnswer", "Hide answer") : t("kit.revealFull", "Reveal full answer")}
            </button>
          )}
          <button className="btn" onClick={() => step(1)}>
            {t("kit.next", "Next →")}
          </button>
        </div>
        {showDeep && (
          <div className="v8-self-check">
            <b>{t("kit.selfCheck", "How well did you know this?")}</b>
            <div className="v5-actions v5-center">
              <button className="btn" onClick={() => rateCard(1)}>
                {t("kit.rateAgain", "↻ Review again")}
              </button>
              <button className="btn btn-primary" onClick={() => rateCard(2)}>
                {t("kit.rateKnow", "✓ I can explain it")}
              </button>
            </div>
          </div>
        )}
        <div className="v5-actions v5-center">
          <button className="btn btn-sm" onClick={() => move({ ids: rand(flash.ids), i: 0, flipped: false, choice: null })}>
            {t("kit.shuffle", "Shuffle deck")}
          </button>
          <button className="btn btn-sm" onClick={() => onLeave(sourceHome(flash.source))}>
            {t("kit.returnLibrary", "Return to library")}
          </button>
        </div>
      </div>
    </>
  );
}

function QuizView({
  quiz,
  setQuiz,
  onLeave,
}: {
  quiz: QuizState;
  setQuiz: (q: QuizState | ((p: QuizState | null) => QuizState | null)) => void;
  onLeave: (target: KitHome) => void;
}) {
  const t = useT();
  const { updateMem } = useKit();
  const qs = quiz.items;
  const i = Math.min(quiz.current, qs.length - 1);
  const q = qs[i];
  const selected = quiz.answers[i];
  const isMulti = q.kind === "multi";
  const isChosen = (j: number) => (isMulti ? Array.isArray(selected) && selected.includes(j) : selected !== undefined && Number(selected) === j);
  const done = Object.keys(quiz.answers).length;
  const errors = quiz.submitted ? qs.filter((it, k) => !quizCorrect(it, quiz.answers[k])).length : 0;
  const score = quiz.submitted ? Math.round(((qs.length - errors) / qs.length) * 100) : null;
  const patch = (p: Partial<QuizState>) => setQuiz((c) => (c ? { ...c, ...p } : c));
  const optCorrect = (o: string) => (isMulti ? q.correct.includes(o) : o === q.correct);

  const answer = (j: number, checked: boolean) => {
    if (quiz.submitted) return;
    if (isMulti) {
      const old = Array.isArray(selected) ? selected : [];
      const next = checked ? [...old, j] : old.filter((v) => v !== j);
      if (next.length > 2) return;
      patch({ answers: { ...quiz.answers, [quiz.current]: next } });
    } else {
      patch({ answers: { ...quiz.answers, [quiz.current]: j } });
    }
  };

  const submit = () => {
    if (quiz.submitted) return;
    const unanswered = qs.length - Object.keys(quiz.answers).length;
    if (unanswered && !window.confirm(`${unanswered} questions are unanswered. Submit anyway?`)) return;
    const correct = qs.filter((it, k) => quizCorrect(it, quiz.answers[k])).length;
    updateMem((m) => {
      m.quizzes.push({
        type: quiz.type,
        domain: quiz.domain,
        chapter: quiz.chapter,
        total: qs.length,
        correct,
        percent: Math.round((100 * correct) / qs.length),
        date: new Date().toISOString(),
      });
    });
    patch({ submitted: true, current: 0 });
    scrollTop();
  };

  const domainClass = quiz.type === "laws" ? "domain-1" : quiz.type === "typologies" ? "domain-3" : `domain-${quiz.domain}`;

  return (
    <>
      <KitTop
        title={quiz.submitted ? t("kit.quizResultsTitle", "Practice Mock Results") : t("kit.quizTitle", "Focused Practice Mock")}
        desc={
          quiz.type === "laws"
            ? t("kit.quizDescLaws", "Law and regulation distinctions")
            : quiz.type === "typologies"
              ? t("kit.quizDescTypologies", "Fraud classification and typology distinctions")
              : `Module ${quiz.domain} · Chapter ${quiz.chapter}`
        }
        breadcrumb={quiz.submitted ? "ANSWER REVIEW" : "PRACTICE MOCK"}
      />
      {quiz.submitted ? (
        <div className="v5-results">
          <KitStat value={`${score}%`} label={t("kit.statScore", "Your practice score")} />
          <KitStat value={qs.length - errors} label={t("kit.statCorrect", "Correct answers")} />
          <KitStat value={errors} label={t("kit.statMissed", "Missed questions")} />
          <div className="v5-note">
            {t("kit.unscored", "Unscored supplementary knowledge check, separate from your six core CAFS mock-exam readiness indicators.")}
          </div>
        </div>
      ) : (
        <div className="v5-hint">
          {done} / {qs.length} answered · {t("kit.changeBeforeSubmit", "You can change your choices before submission. Answer keys stay hidden until you submit.")}
        </div>
      )}
      <div className="v5-progress">
        <i style={{ width: `${(done / qs.length) * 100}%` }} />
      </div>
      <div className="v5-quizlayout">
        <article className="v5-panel">
          <div className="v5-kicker">
            QUESTION {i + 1} OF {qs.length} · {q.topic}
          </div>
          <h2 className="v5-question">{q.stem}</h2>
          {isMulti && <div className="v5-hint">{t("kit.selectTwoHint", "Select exactly TWO answers. Both must be correct.")}</div>}
          <div className="v5-choices">
            {q.options.map((o: string, j: number) => (
              <label
                key={`${i}-${j}`}
                className={cx("v5-choice", isChosen(j) && "chosen", quiz.submitted && optCorrect(o) && "correct", quiz.submitted && isChosen(j) && !optCorrect(o) && "incorrect")}
              >
                <input
                  type={isMulti ? "checkbox" : "radio"}
                  name="v5Answer"
                  checked={isChosen(j)}
                  disabled={quiz.submitted}
                  onChange={(e) => answer(j, e.target.checked)}
                />
                <b>{"ABCD"[j]}.</b>
                <span>{o}</span>
              </label>
            ))}
          </div>
          {quiz.submitted && (
            <div className="v5-feedback">
              <b>{quizCorrect(q, selected) ? t("kit.fbCorrect", "Correct") : t("kit.fbRevise", "Revise this concept")}</b>
              <p>{q.explanation}</p>
            </div>
          )}
          <div className="v5-actions">
            <button className="btn" onClick={() => patch({ current: Math.max(0, quiz.current - 1) })}>
              {t("kit.prev", "← Previous")}
            </button>
            <button className="btn" onClick={() => patch({ current: Math.min(qs.length - 1, quiz.current + 1) })}>
              {t("kit.next", "Next →")}
            </button>
            {quiz.submitted ? (
              <button className="btn btn-primary" onClick={() => onLeave(sourceHome(quiz.type))}>
                {t("kit.finishReview", "Finish review")}
              </button>
            ) : (
              <button className="btn btn-primary" onClick={submit}>
                {t("kit.submitScore", "Submit & score")}
              </button>
            )}
          </div>
        </article>
        <aside className="v5-panel">
          <h3>{t("kit.navigator", "Question navigator")}</h3>
          <div className="v5-qgrid">
            {qs.map((a, j) => (
              <button
                key={j}
                className={cx(
                  "v8-mini-q",
                  domainClass,
                  j === i && "active",
                  quiz.answers[j] !== undefined && "answered",
                  quiz.submitted && (quizCorrect(a, quiz.answers[j]) ? "correct" : "wrong"),
                )}
                onClick={() => patch({ current: j })}
              >
                {j + 1}
              </button>
            ))}
          </div>
          <p className="v5-hint">
            {quiz.submitted
              ? t("kit.reviewMistakes", "Review every mistake and its explanation before returning to revision.")
              : t("kit.scoredAtSubmission", "All responses are scored only at submission. No partial credit.")}
          </p>
          <button className="btn" onClick={() => onLeave(sourceHome(quiz.type))}>
            {t("kit.exitMock", "Exit mock")}
          </button>
        </aside>
      </div>
    </>
  );
}
