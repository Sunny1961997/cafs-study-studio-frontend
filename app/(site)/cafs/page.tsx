import type { Metadata } from "next";
import Link from "next/link";
import { CafsShell, Faq, StudyTools } from "@/components/cafs/CafsShell";
import { PracticeQuestion } from "@/components/cafs/PracticeQuestion";
import { cafs, hrefs } from "@/lib/cafs";

const page = cafs.pages[0];
const sections = page.sections as any[];
const faq = sections.find((x) => x.id === "course-faq");
const cta = sections.find((x) => x.id === "course-plans");
const counts = cafs.course.practiceCounts;

export const metadata: Metadata = {
  title: page.metadata.title,
  description: page.metadata.description,
};

export default function CafsLandingPage() {
  const facts: [number, string][] = [
    [counts.mockExams, "Full mock exams"],
    [counts.domainAssessments, "Domain assessments"],
    [counts.chapterFlashcards, "Chapter flashcards"],
    [counts.caseStudies, "Case studies"],
  ];

  return (
    <CafsShell active="curriculum">
      <section className={`${"cafs-section"} ${"cafs-tint"}`}>
        <div className={`${"cafs-container"} ${"cafs-hero"}`}>
          <div>
            <p className={"cafs-label"}>{cafs.course.credentialLabel}</p>
            <h1>Prepare for the CAFS Exam</h1>
            <p className={"cafs-heroBody"}>{cafs.course.summary}</p>
            <div className={"cafs-actions"}>
              <Link href={hrefs.pricing} className={`${"cafs-btn"} ${"cafs-primary"}`}>View Plans</Link>
              <a href="#free-question" className={`${"cafs-btn"} ${"cafs-secondary"}`}>Try a Free Question</a>
            </div>
          </div>
          <PracticeQuestion />
        </div>
      </section>

      <section aria-label="Course at a glance">
        <dl className={"cafs-facts"}>
          {facts.map(([v, l]) => (
            <div key={l} className={"cafs-fact"}>
              <dd className={"cafs-factValue"}>{v}</dd>
              <dt className={"cafs-factLabel"}>{l}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section id="curriculum" className={`${"cafs-section"} ${"cafs-tint"} ${"cafs-anchor"}`}>
        <div className={"cafs-container"}>
          <h2>Course Curriculum</h2>
          <p className={"cafs-lede"}>Explore three domains and 12 topics, from building a fraud risk program to closing an investigation.</p>
          <div className={"cafs-accordion"}>
            {cafs.course.domains.map((d) => (
              <details key={d.id} open={d.id === "fraud-risk-management"}>
                <summary>Domain {d.order} · {d.title}</summary>
                <div className={"cafs-panel"}>
                  <p>{d.description}</p>
                  <ul>{d.topics.map((t) => <li key={t}>{t}</li>)}</ul>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className={"cafs-section"}>
        <div className={"cafs-container"}>
          <StudyTools heading={"What You’ll Study With"} />
          <h2 className={"cafs-spacer"}>{faq.heading}</h2>
          <Faq items={faq.items} />
        </div>
      </section>

      <section className={`${"cafs-section"} ${"cafs-tint"} ${"cafs-cta"}`}>
        <div className={"cafs-container"}>
          <h2>{cta.heading}</h2>
          <p>{cta.body}</p>
          <div className={"cafs-actions"}>
            <Link href={hrefs.pricing} className={`${"cafs-btn"} ${"cafs-primary"}`}>{cta.action.label}</Link>
          </div>
        </div>
      </section>
    </CafsShell>
  );
}
