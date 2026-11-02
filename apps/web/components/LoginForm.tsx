"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthShell, { Field, PasswordInput } from "./AuthShell";
import { useAuth } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginForm() {
  const { user, ready, signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/dashboard");
  }, [ready, user, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email, like you@company.com.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await signIn({ email, password });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not log in. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      sub="Log in to run the pipeline and review findings."
      footer={
        <>
          New to CodeForge?{" "}
          <Link href="/signup" className="font-bold text-ember-hot hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <Field label="Email" id="email" error={errors.email}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
            className="input"
          />
        </Field>
        <Field label="Password" id="password" error={errors.password}>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            invalid={!!errors.password}
            describedBy={errors.password ? "password-error" : undefined}
          />
        </Field>
        <div aria-live="polite">
          {formError && (
            <p role="alert" className="rounded-xl border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-bad">
              {formError}
            </p>
          )}
        </div>
        <button type="submit" disabled={busy} className="btn-ember w-full !py-3.5">
          {busy ? "Logging in…" : "Log in"}
        </button>
        <p className="text-center text-xs leading-relaxed text-mute">
          Accounts are stored in this browser only. The CodeForge API does not have user accounts yet.{" "}
          <Link href="/dashboard" className="text-paper underline underline-offset-4">
            Open the dashboard without one
          </Link>
          .
        </p>
      </form>
    </AuthShell>
  );
}
