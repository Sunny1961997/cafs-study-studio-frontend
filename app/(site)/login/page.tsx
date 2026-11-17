"use client";

import "./login.css";
import { Instrument_Sans, Manrope } from "next/font/google";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { openSession } from "@/components/Gate";
import { errorText, getToken } from "@/lib/api";

const heading = Manrope({ subsets: ["latin"], weight: ["800"], variable: "--font-heading" });
const body = Instrument_Sans({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-body" });

const slides = [
  { src: "/login/cafs-exam-preparation.webp", title: "Prepare With Purpose", text: "One study session at a time." },
  { src: "/login/cafs-fraud-analysis.webp", title: "Think Like an Investigator", text: "Follow the evidence. Test your assumptions." },
  { src: "/login/cafs-career-growth.webp", title: "Build Your Fraud Expertise", text: "Bring what you learn into your next case." },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [challenge, setChallenge] = useState<[number, number]>([4, 3]);
  const [answer, setAnswer] = useState("");
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (getToken()) router.replace("/studio");
  }, [router]);

  useEffect(() => {
    setChallenge([2 + Math.floor(Math.random() * 8), 2 + Math.floor(Math.random() * 8)]);
  }, []);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
  }, []);

  const sync = useCallback(() => {
    clearInterval(timer.current);
    if (playing && !document.hidden) {
      timer.current = setInterval(() => setActive((i) => (i + 1) % slides.length), 8000);
    }
  }, [playing]);

  useEffect(() => {
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(timer.current);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [sync]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (answer.trim() !== String(challenge[0] + challenge[1])) {
      setError("Please complete the security check and try again.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await openSession("/api/login", { email, password });
      router.push("/studio");
    } catch (caught) {
      setError(errorText(caught));
      setAnswer("");
      setChallenge([2 + Math.floor(Math.random() * 8), 2 + Math.floor(Math.random() * 8)]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={`cl ${heading.variable} ${body.variable}`}>
      <header className="head">
        <div className="brand">
          <a className="brand-link" href="https://financialcrimelab.com/" target="_blank" rel="noopener">
            <span className="monogram" aria-hidden="true">FCL</span> FCL Academy
          </a>
        </div>
        <Link href="/cafs">‹ Back to Course</Link>
      </header>
      <main className="shell">
        <aside className="story" aria-label="CAFS Study Studio slideshow">
          {slides.map((s, i) => (
            <div key={s.src} className={`frame${i === active ? " active" : ""}`} aria-hidden={i !== active}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt="" width={900} height={1125} decoding="async" />
              <div className="slide-copy">
                <h2>{s.title}</h2>
                <p>{s.text}</p>
              </div>
            </div>
          ))}
          <p className="studio-label">CAFS Study Studio</p>
          <div className="slider-controls">
            <div className="slide-dots" role="group" aria-label="Choose a slide">
              {slides.map((s, i) => (
                <button
                  key={s.src}
                  type="button"
                  className="slide-dot"
                  aria-label={s.title}
                  aria-pressed={i === active}
                  onClick={() => {
                    setPlaying(false);
                    setActive(i);
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              className="playback"
              aria-label={playing ? "Pause slideshow" : "Play slideshow"}
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? "Pause" : "Play"}
            </button>
          </div>
        </aside>
        <section className="sign-in" aria-labelledby="cafs-sign-in-title" onFocus={() => setPlaying(false)}>
          <h1 id="cafs-sign-in-title">Sign In</h1>
          <p className="intro">Use your FCL Academy account to access the Study Studio.</p>
          <form onSubmit={submit}>
            <label htmlFor="email">Email Address</label>
            <input id="email" type="email" placeholder="you@example.com" autoComplete="username" required maxLength={180} value={email} onChange={(e) => setEmail(e.target.value)} />
            <div className="pw-head">
              <label htmlFor="password">Password</label>
              <a href="mailto:info@financialcrimelab.com?subject=CAFS%20Study%20Studio%20sign-in%20help">Forgot Password?</a>
            </div>
            <div className="row">
              <input id="password" type={show ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" aria-controls="password" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((s) => !s)}>
                {show ? "Hide" : "Show"}
              </button>
            </div>
            <div className="verification">
              <label htmlFor="check">Security Check</label>
              <div className="row">
                <span id="check-prompt">{challenge[0]} + {challenge[1]} =</span>
                <input id="check" type="text" inputMode="numeric" autoComplete="off" aria-labelledby="check-prompt" required value={answer} onChange={(e) => setAnswer(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="submit" disabled={pending}>
              {pending ? "Signing In…" : "Sign In"}
            </button>
            <p className="status" role="status">{error}</p>
          </form>
          <div className="next">
            <p>New to the Study Studio? <Link href="/register">Create an Account</Link></p>
            <Link href="/cafs">Explore the Course</Link>{" · "}
            <Link href="/cafs#free-question">Try a Free Question →</Link>
          </div>
        </section>
      </main>
      <footer className="foot">
        <a href="https://financialcrimelab.com/" target="_blank" rel="noopener">Financial Crime Lab</a>
        <div>
          <a href="mailto:info@financialcrimelab.com">Need Help?</a> ·{" "}
          <a href="https://financialcrimelab.com/privacy-policy/" target="_blank" rel="noopener">Privacy Policy</a>
        </div>
      </footer>
    </div>
  );
}