import { Suspense } from "react";
import { ExamPage } from "@/components/studio/exam/ExamWorkspace";

// The studio renders client-side once its provider has loaded the learner data.
export const instant = false;

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ExamPage />
    </Suspense>
  );
}
