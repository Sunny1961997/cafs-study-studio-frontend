// Sidebar navigation of the studio (final order, as rendered by the original page).

export type NavItem = { id: string; label: string; icon: string };
export type NavSection = { title: string; items: NavItem[] };

export const NAV: NavSection[] = [
  { title: "Overview", items: [{ id: "overview", label: "Fraud Learning Dashboard", icon: "layout" }] },
  {
    title: "Learn & revise",
    items: [
      { id: "examPrep", label: "Fraud Exam Readiness Coach", icon: "target" },
      { id: "cheatSheets", label: "Fraud Rapid Revision Briefs", icon: "book" },
      { id: "namesNumbers", label: "Fraud Metrics, Terms & Figures", icon: "target" },
      { id: "handbookMap", label: "Study Guide Domain Map", icon: "layers" },
      { id: "moduleHub", label: "CAFS Domain Learning Hub", icon: "layers" },
      { id: "adaptivePath", label: "Fraud Adaptive Revision Path", icon: "target" },
      { id: "chapterSummaries", label: "Fraud Domain Summaries", icon: "book" },
      { id: "redFlags", label: "Fraud Red Flags & Indicators", icon: "target" },
      { id: "caseStudies", label: "Fraud Case Study Library", icon: "book" },
      { id: "memorize", label: "Fraud Recall & Flashcards", icon: "book" },
      { id: "laws", label: "Fraud Laws · Interactive Exam Guide", icon: "book" },
      { id: "integratedKnowledge", label: "Integrated Knowledge · 54 Topics", icon: "layers" },
      { id: "typologies", label: "Fraud Schemes & Typologies", icon: "layers" },
    ],
  },
  {
    title: "Practise & assess",
    items: [
      { id: "chapters", label: "Fraud Domain Assessments", icon: "book" },
      { id: "sprints", label: "Fraud Skills Drills", icon: "clock" },
      { id: "advancedBank", label: "Advanced Fraud Question Bank", icon: "book" },
      { id: "mocks", label: "Fraud Mock Examination Centre", icon: "layers" },
      { id: "library", label: "Fraud Question Library", icon: "book" },
    ],
  },
  { title: "Review progress", items: [{ id: "insights", label: "Fraud Performance Insights", icon: "chart" }] },
];

export const NAV_ITEMS: NavItem[] = NAV.flatMap((section) => section.items);

/** URL of a studio page: overview lives at /studio, the rest at /studio/<id>. */
export const pageHref = (id: string) => (id === "overview" ? "/studio" : `/studio/${id}`);

/** Page id for a pathname, e.g. "/studio/mocks" → "mocks". */
export function pageIdFromPath(pathname: string): string {
  const rest = pathname.replace(/^\/studio\/?/, "").split("/")[0];
  return rest || "overview";
}

/** Routes of the assessment sub-screens (owned by the exam pages, linked from everywhere). */
export const examHref = (examId: string) => `/studio/exam/${examId}`;
export const resultsHref = (examId: string) => `/studio/results/${examId}`;
export const drillHref = () => "/studio/drill";
