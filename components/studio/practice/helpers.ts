// Pure helpers shared by the practice and progress screens (ported from the original base script).

import { isCorrect } from "@/lib/studio/engine";
import type { Db, Exam, ExamQuestion, Rec } from "@/lib/studio/types";

export const stableStem = (q: Rec) => q.conceptFamily || String(q.stem || "").trim().toLowerCase().replace(/\s+/g, " ");
export const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);
export const topicOf = (q: Rec): string => q.sourceSection || q.topic;

export function guideAction(q: Rec | undefined): string {
  const t = ((q?.sourceSection || "") + " " + (q?.topic || "")).toLowerCase();
  if (/precision|recall|confusion|false positive|false negative|selection and evaluation metrics/.test(t)) return "Draw a confusion matrix. Identify TP, FP and FN, then calculate precision = TP/(TP+FP) and recall = TP/(TP+FN). Explain the trade-off for customers.";
  if (/first.party|second.party|third.party|synthetic|identity theft|mule/.test(t)) return "Separate who used the identity, who controls the account and whether the owner knowingly collaborated. Then classify the fraud before choosing a control.";
  if (/risk assessment|inherent|residual|risk appetite|rcsa/.test(t)) return "Write down the risk before controls, control effectiveness and risk remaining after controls; prioritize the highest residual risks against appetite.";
  if (/line.of.defense|governance|oversight|fraud risk management framework/.test(t)) return "Distinguish operational ownership, independent oversight and independent assurance. Assign each action to the correct line of defense.";
  if (/authorization|authentication|account takeover|push payment|app fraud/.test(t)) return "Ask whether the customer authorized the payment or whether another person gained account access. Match prevention and reimbursement responses to the actual scenario.";
  if (/supervised|unsupervised|machine.learning|bias|model|training|validation|overfit/.test(t)) return "Determine whether labels exist, what data were available at decision time, and how the method is validated on unseen transactions.";
  if (/data extraction|transform|loading|structured|unstructured|data source|matching/.test(t)) return "Map source collection, cleansing, transformation and cross-source validation. Identify the point where unreliable data could invalidate an apparent fraud signal.";
  if (/evidence|chain of custody|interview|peace|statement|investigation plan/.test(t)) return "Trace the evidence sequence: lawful collection, preservation, chain of custody, corroboration and impartial interviewing. Note when an investigative conclusion is premature.";
  if (/recovery|chargeback|payment network|case closure|reporting|exit/.test(t)) return "Separate immediate containment, recovery routes, reporting and final case closure; verify which action is appropriate at each stage.";
  if (/feedback|root cause|remediation|monitoring|fraud controls/.test(t)) return "Distinguish the immediate fraud incident from its enabling control failure. Propose an owned corrective action and a metric to confirm it works.";
  return `Re-read “${q?.sourceSection || q?.topic || "this section"}” in the supplied guide. Compare the chosen and correct options, then write the deciding fact as a one-sentence rule.`;
}

export type EvidenceItem = { q: ExamQuestion; a: number[]; ok: boolean; attempt: string; at: number };

/** Every stored attempt with per-question detail; `first` keeps the first exposure of each distinct question. */
export function evidenceSamples(exams: Exam[], db: Db) {
  const records: { ex: Exam; answers: number[][]; at: number; sort: number }[] = [];
  for (const ex of exams) {
    const h = db.history[ex.id] || [];
    const latest = db.sessions[ex.id];
    h.forEach((v, i) => {
      if (Array.isArray(v.answers) && v.answers.length === 100) records.push({ ex, answers: v.answers, at: Number(v.at) || 0, sort: i });
    });
    if (latest?.submitted && Array.isArray(latest.answers) && latest.answers.length === 100) {
      const present = h.some((v) => Array.isArray(v.answers) && Number(v.at) === Number(latest.submittedAt));
      if (!present) records.push({ ex, answers: latest.answers, at: latest.submittedAt || 0, sort: 999 });
    }
  }
  records.sort((a, b) => a.at - b.at || a.sort - b.sort);
  const firstMap = new Map<string, EvidenceItem>();
  const all: EvidenceItem[] = [];
  for (const attempt of records) {
    attempt.ex.questions.forEach((q, i) => {
      const a = attempt.answers[i] || [];
      const item = { q, a, ok: isCorrect(q, a), attempt: attempt.ex.id, at: attempt.at };
      all.push(item);
      const key = stableStem(q);
      if (!firstMap.has(key)) firstMap.set(key, item);
    });
  }
  return { first: [...firstMap.values()], all, records };
}

export type TopicAgg = { domain: number; key: string; example: ExamQuestion; total: number; correct: number; wrong: number };

export function aggregateKnowledge(items: EvidenceItem[]) {
  const domains = new Map([1, 2, 3].map((d) => [d, { domain: d, correct: 0, total: 0, wrong: 0 }]));
  const topics = new Map<string, TopicAgg>();
  const types = new Map([
    ["single", { total: 0, correct: 0 }],
    ["multi", { total: 0, correct: 0 }],
  ]);
  items.forEach(({ q, ok }) => {
    const d = domains.get(q.domain)!;
    d.total++;
    d.correct += Number(ok);
    d.wrong += Number(!ok);
    const k = q.domain + "|" + topicOf(q);
    let t = topics.get(k);
    if (!t) {
      t = { domain: q.domain, key: topicOf(q), example: q, total: 0, correct: 0, wrong: 0 };
      topics.set(k, t);
    }
    t.total++;
    t.correct += Number(ok);
    t.wrong += Number(!ok);
    const type = types.get(q.kind);
    if (type) {
      type.total++;
      type.correct += Number(ok);
    }
  });
  return { domains: [...domains.values()], topics: [...topics.values()], types };
}

export function readinessInsight(exams: Exam[], db: Db, records: unknown[], domains: { total: number; correct: number }[]) {
  const done = (type: string) => exams.filter((e) => e.type === type).map((e) => ({ e, s: db.sessions[e.id] })).filter((x) => x.s?.submitted);
  const mocks = done("mock");
  const chapters = done("chapter");
  if (!records.length) return { label: "Not assessed yet", detail: "Submit your first assessment to generate domain and topic findings." };
  if (mocks.length < 2) return { label: "More mixed mocks needed", detail: "Complete at least two full mixed mock exams before using mock percentages as a broad readiness signal." };
  const twoHigh = mocks.filter((x) => (x.s.score ?? 0) >= 85).length >= 2;
  const covered = domains.every((d) => d.total >= 15);
  const allChaptersReady = chapters.length === 3 && chapters.every((x) => (x.s.score ?? 0) >= 80);
  const domainFloors = domains.every((d) => d.total >= 15 && pct(d.correct, d.total) >= 80);
  if (twoHigh && covered && allChaptersReady && domainFloors) return { label: "Strong practice signal", detail: "Two or more completed mixed mocks reached 85%, and sampled domain coverage is broad. Verify against unfamiliar questions; this is not a pass prediction." };
  return { label: "Targeted revision advised", detail: "Build toward 85%+ in at least two mixed mocks, 80%+ in each chapter and enough first-seen coverage in all domains." };
}
