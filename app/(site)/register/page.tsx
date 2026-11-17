"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { api, errorText, getToken } from "@/lib/api";

function makePuzzle() {
  return {
    left: 1 + Math.floor(Math.random() * 12),
    right: 1 + Math.floor(Math.random() * 12),
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [consent, setConsent] = useState(false);
  const [puzzle, setPuzzle] = useState<{ left: number; right: number } | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [waitingEmail, setWaitingEmail] = useState("");

  useEffect(() => {
    if (getToken()) router.replace("/studio");
    setPuzzle(makePuzzle());
  }, [router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!puzzle) return;
    setPending(true);
    setError("");
    try {
      await api("/api/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          last_name: lastName,
          email,
          phone,
          password,
          password_confirmation: passwordConfirmation,
          consent,
          humanity_left: puzzle.left,
          humanity_right: puzzle.right,
          humanity_answer: Number(answer),
        }),
      });
      setWaitingEmail(email);
    } catch (caught) {
      setError(errorText(caught));
      setPuzzle(makePuzzle());
      setAnswer("");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-page">
      <SiteHeader />
      <main className="welcome">
        <section className="welcome-card">
          <aside className="welcome-aside">
            <div className="welcome-mark">FCL</div>
            <p>Create a learner account. An administrator approves it before you can sign in.</p>
            <span>Fraud Intelligence Academy</span>
          </aside>
          {waitingEmail ? (
            <div className="welcome-form">
              <div className="welcome-logo" aria-hidden="true">
                FCL
              </div>
              <h1>PENDING</h1>
              <p className="welcome-lede">
                {waitingEmail} is waiting for an administrator. The account role is learner and the status stays pending until it is approved.
              </p>
              <Link className="welcome-submit register-back" href="/login">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form className="welcome-form" onSubmit={handleSubmit}>
              <div className="welcome-logo" aria-hidden="true">
                FCL
              </div>
              <h1>REGISTER</h1>
              <p className="welcome-lede">Learner account · status pending until approval</p>
              {error ? <div className="form-error">{error}</div> : null}
              <div className="name-row">
                <label className="field">
                  Name
                  <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} autoComplete="given-name" />
                </label>
                <label className="field">
                  Last name
                  <input value={lastName} onChange={(event) => setLastName(event.target.value)} required maxLength={100} autoComplete="family-name" />
                </label>
              </div>
              <label className="field">
                Email
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={180} autoComplete="email" />
              </label>
              <label className="field">
                Phone number
                <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required maxLength={30} autoComplete="tel" />
              </label>
              <label className="field">
                Password
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="new-password" />
              </label>
              <label className="field">
                Confirm password
                <input
                  type="password"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>
              <label className="field humanity">
                Prove your humanity
                <span>
                  {puzzle ? `${puzzle.left} + ${puzzle.right} =` : "…"}
                  <input
                    inputMode="numeric"
                    aria-label="Humanity check answer"
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    required
                  />
                </span>
              </label>
              <label className="check">
                <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required />
                <span>I agree that my name, email, and phone number will be stored as my learner record.</span>
              </label>
              <button className="welcome-submit" type="submit" disabled={pending || !puzzle}>
                {pending ? "Creating account…" : "Create account"}
              </button>
              <p className="welcome-switch">
                Already have an account? <Link href="/login">Sign in</Link>
              </p>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
