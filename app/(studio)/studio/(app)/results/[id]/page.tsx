import { ResultsPage } from "@/components/studio/exam/ResultsPage";

// The studio renders client-side once its provider has loaded the learner data.
export const instant = false;

export default function Page() {
  return <ResultsPage />;
}
