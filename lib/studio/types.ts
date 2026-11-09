/* eslint-disable @typescript-eslint/no-explicit-any */
// Shapes of the studio content datasets (public/data/*.json, or the Laravel API).
// Only the fields the engine itself relies on are spelled out; everything else stays open.

export type Rec = { [key: string]: any };

/** A question inside an exam (exams.json → questions[]). `correct` is a list of option indexes. */
export type ExamQuestion = {
  id: string;
  domain: number;
  topic: string;
  stem: string;
  options: string[];
  correct: number[];
  explanation: string;
  kind: string;
  [key: string]: any;
};

export type Exam = {
  id: string;
  type: "chapter" | "mock" | string;
  chapter?: number;
  title: string;
  short: string;
  name: string;
  subtitle: string;
  questions: ExamQuestion[];
  distribution: number[];
  track: string;
  level: string;
  description: string;
  [key: string]: any;
};

/** A question of the supplemental library (bank.json). */
export type BankQuestion = {
  id: string;
  module: number;
  chapter: string;
  stem: string;
  options: string[];
  correct: number[];
  explanation: string;
  kind: string;
  [key: string]: any;
};

/** Everything fetched from /data. Missing datasets are empty. */
export type StudioContent = {
  bank: BankQuestion[];
  exams: Exam[];
  kit: { laws: Rec[]; typologies: Rec[]; chapters: Rec[]; flashcards: Rec[] };
  handbook: Rec[];
  cases: Rec[];
  summaries: Rec[];
  redFlags: Rec[];
  studyFacts: Rec[];
  studySheets: Rec[];
  tasks: Rec[];
  traps: string[];
  typeSpec: string[][];
  lawSpec: string[][];
  lawsList: Rec[];
  lawsQuiz: Rec[];
  ikData: { rows: Rec[]; index: Rec[]; questions: Rec[]; catmeta: Rec };
  ikChapters: Record<string, string>;
  tpl: string[];
};

/** Saved learner state kept under `cafs_studio_v4_draft_600`. */
export type Session = {
  answers: number[][];
  flags: boolean[];
  current: number;
  submitted: boolean;
  startedAt: number;
  endAt: number | null;
  timeLimit: number;
  simulationMode: string;
  questionBankRevision: string | null;
  score: number | null;
  [key: string]: any;
};

export type Db = {
  sessions: Record<string, Session>;
  history: Record<string, { score: number; at: number; [key: string]: any }[]>;
  drills: Rec[];
};
