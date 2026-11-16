import "./cafs.css";
import Link from "next/link";
import { Instrument_Sans, Manrope } from "next/font/google";
import { cafs, hrefs } from "@/lib/cafs";

const heading = Manrope({ subsets: ["latin"], weight: ["800"], variable: "--font-heading" });
const body = Instrument_Sans({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-body" });

export function CafsShell({ active, children }: { active?: "curriculum" | "plans"; children: React.ReactNode }) {
  const nav = [
    { label: "Curriculum", href: `${hrefs.landing}#curriculum`, key: "curriculum" },
    { label: "Plans", href: hrefs.pricing, key: "plans" },
  ] as const;
  const { header, footer } = cafs.sharedComponents;

  return (
    <div className={`${"cafs-root"} ${heading.variable} ${body.variable}`}>
      <header className={"cafs-header"}>
        <div className={`${"cafs-container"} ${"cafs-headerInner"}`}>
          <a className={"cafs-brand"} href={hrefs.fclHome}>{header.brandLabel}</a>
          <div className={"cafs-headerRight"}>
            <nav className={"cafs-nav"} aria-label="Main">
              {nav.map((n) => (
                <Link key={n.key} href={n.href} className={`${"cafs-navLink"} ${active === n.key ? "cafs-navActive" : ""}`}>
                  {n.label}
                </Link>
              ))}
            </nav>
            <details className={"cafs-menu"}>
              <summary>Menu</summary>
              <div className={"cafs-menuPanel"}>
                {nav.map((n) => (
                  <Link key={n.key} href={n.href}>{n.label}</Link>
                ))}
              </div>
            </details>
            <Link href={hrefs.studentLogin} className={`${"cafs-btn"} ${"cafs-secondary"}`}>Student Login ↗</Link>
          </div>
        </div>
      </header>
      <main className={"cafs-main"}>{children}</main>
      <footer className={"cafs-footer"}>
        <div className={"cafs-container"}>
          <div className={"cafs-footerTop"}>
            <span className={"cafs-footerBrand"}>{footer.brandLabel}</span>
            <div className={"cafs-footerLinks"}>
              <a href={hrefs.privacy}>Privacy Policy</a>
              <a href={hrefs.support}>Contact FCL Academy</a>
            </div>
          </div>
          <p className={"cafs-footerNote"}>{footer.courseNote}</p>
        </div>
      </footer>
    </div>
  );
}

export function Faq({ items }: { items: { question: string; answer: string; action?: { label: string } }[] }) {
  return (
    <div className={"cafs-accordion"}>
      {items.map((f) => (
        <details key={f.question}>
          <summary>{f.question}</summary>
          <div className={"cafs-panel"}>
            <p>{f.answer}</p>
            {f.action && (
              <Link href={hrefs.studentLogin} className={`${"cafs-btn"} ${"cafs-secondary"} ${"cafs-faqAction"}`}>{f.action.label}</Link>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

export function StudyTools({ heading: h }: { heading: string }) {
  return (
    <>
      <h2>{h}</h2>
      <div className={"cafs-grid"}>
        {cafs.course.studyTools.map((t) => (
          <div key={t.id} className={"cafs-feature"}>
            <h3>{t.title}</h3>
            <p>{t.description}</p>
          </div>
        ))}
      </div>
    </>
  );
}
