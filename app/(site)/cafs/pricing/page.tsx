import type { Metadata } from "next";
import Link from "next/link";
import { CafsShell, Faq, StudyTools } from "@/components/cafs/CafsShell";
import { PlanCards } from "@/components/cafs/PlanCards";
import { cafs, hrefs } from "@/lib/cafs";

const page = cafs.pages[1];
const sections = page.sections as any[];
const intro = sections.find((x) => x.id === "pricing-overview");
const faq = sections.find((x) => x.id === "pricing-faq");
const { checkout, plans } = cafs.pricing;

export const metadata: Metadata = {
  title: page.metadata.title,
  description: page.metadata.description,
};

export default function CafsPricingPage() {
  const anyLive = plans.some((p) => checkout.enabled && (checkout.urlsByPlanId as Record<string, string | null>)[p.id]?.startsWith("https://"));

  return (
    <CafsShell active="plans">
      <section className={`${"cafs-section"} ${"cafs-tint"} ${"cafs-introSection"}`}>
        <div className={`${"cafs-container"} ${"cafs-intro"}`}>
          <div className={"cafs-backRow"}>
            <Link href={hrefs.landing} className={"cafs-back"}>‹ {intro.backLink.label}</Link>
          </div>
          <h1>{intro.heading}</h1>
          <p>{intro.body}</p>
        </div>
      </section>

      <section className={"cafs-section"}>
        <div className={"cafs-container"}>
          <PlanCards />
          {!anyLive && (
            <div className={"cafs-prelaunch"}>
              <p>{checkout.disabledMessage}</p>
              <a href={hrefs.support} className={`${"cafs-btn"} ${"cafs-secondary"}`}>{checkout.prelaunchAction.label}</a>
            </div>
          )}
        </div>
      </section>

      <section className={`${"cafs-section"} ${"cafs-tint"}`}>
        <div className={"cafs-container"}>
          <StudyTools heading="Included in Every Plan" />
        </div>
      </section>

      <section className={"cafs-section"}>
        <div className={"cafs-container"}>
          <h2>{faq.heading}</h2>
          <Faq items={faq.items} />
        </div>
      </section>
    </CafsShell>
  );
}
