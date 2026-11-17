"use client";

// Dashboard shortcut "Fraud Adaptive Learning · PERSONALIZED" with the "Open my improvement plan" button.
// The original prepended it (.ad15-shortcut) to Overview, Insights, Results, Module Hub and Exam Readiness pages.
//
// Props: none. Usage: <AdaptiveDashboardCard /> as the first child of the page content.
// The button navigates to /studio/adaptivePath.

import { useRouter } from "next/navigation";
import { useT } from "@/lib/studio/StudioProvider";

export function AdaptiveDashboardCard() {
  const t = useT();
  const router = useRouter();
  return (
    <div className="ad15-shortcut">
      <div>
        <b>{t("adaptive.card.title", "Fraud Adaptive Learning · PERSONALIZED")}</b>
        <p>
          {t(
            "adaptive.card.text",
            "Study your weak topics through linked chapter summaries, red flags, study-guide cases and scored rechecks.",
          )}
        </p>
      </div>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => router.push("/studio/adaptivePath")}>
        {t("adaptive.card.open", "Open my improvement plan")}
      </button>
    </div>
  );
}
