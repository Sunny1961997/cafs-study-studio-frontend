"use client";

import { FormEvent, ReactNode, useState } from "react";
import { api, errorText, saveSession, type Account } from "@/lib/api";

export function Gate({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <main className="gate">
      <section className="gate-hero">
        <div className="mark">FCL</div>
        <div className="gate-kicker">Fraud Intelligence Academy</div>
        <h1>Recognize fraud. Evaluate evidence. Make defensible decisions.</h1>
        <p>
          CAFS Study Studio keeps the same practice, revision, and mock-exam workspace.
          Sign in to open your licensed copy.
        </p>
      </section>
      <section className="gate-panel">
        <div className="gate-card">
          <h2>{title}</h2>
          <p className="lede">{lede}</p>
          {children}
        </div>
      </section>
    </main>
  );
}

export function AccountFields({
  includeName = false,
  submitLabel,
  footer,
  onSubmit,
}: {
  includeName?: boolean;
  submitLabel: string;
  footer: ReactNode;
  onSubmit: (values: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    consent: boolean;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await onSubmit({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
        consent,
      });
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error ? <div className="form-error">{error}</div> : null}
      {includeName ? (
        <label className="field">
          Full name
          <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} />
        </label>
      ) : null}
      <label className="field">
        Email
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={180} />
      </label>
      <label className="field">
        Password
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={includeName ? 8 : 1} />
      </label>
      {includeName ? (
        <>
          <label className="field">
            Confirm password
            <input
              type="password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              required
              minLength={8}
            />
          </label>
          <label className="check">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required />
            <span>I agree that my name and email will be stored as my licensed recipient record.</span>
          </label>
        </>
      ) : null}
      <button className="primary" type="submit" disabled={pending}>
        {pending ? "Please wait…" : submitLabel}
      </button>
      <p className="switch">{footer}</p>
    </form>
  );
}

export async function openSession(path: string, body: unknown) {
  const result = await api<{ token: string; user: Account }>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
  saveSession(result.token, result.user);
}
