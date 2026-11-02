"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthShell, { Field, PasswordInput } from "./AuthShell";
import { useAuth } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LEVELS = ["Too short", "Weak", "Okay", "Good", "Strong"];

function strength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

export default function SignupForm() {
  const { user, ready, signUp } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/dashboard");
  }, [ready, user, router]);

  const set = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: event.target.value }));
  const level = form.password ? strength(form.password) : -1;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    if (form.name.trim().length < 2) next.name = "Enter your name.";
    if (!EMAIL_RE.test(form.email.trim())) next.email = "Enter a valid email, like you@company.com.";
    if (form.password.length < 8) next.password = "Use at least 8 characters.";
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await signUp(form);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create the account. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      sub="Run the payment fixture and review the findings in under a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-ember-hot hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <Field label="Full name" id="name" error={errors.name}>
          <input
            id="name"
            autoComplete="name"
            value={form.name}
            onChange={set("name")}
            placeholder="Shivam Kumar"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "name-error" : undefined}
            className="input"
          />
        </Field>
        <Field label="Work email" id="email" error={errors.email}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={set("email")}
            placeholder="you@company.com"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
            className="input"
          />
        </Field>
        <Field label="Password" id="password" error={errors.password} hint="At least 8 characters.">
          <PasswordInput
            id="password"
            value={form.password}
            onChange={set("password")}
            autoComplete="new-password"
            invalid={!!errors.password}
            describedBy={errors.password ? "password-error" : undefined}
          />
          {level >= 0 && (
            <div className="mt-2.5 flex items-center gap-3" aria-live="polite">
              <div className="flex flex-1 gap-1.5" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={`h-1.5 flex-1 rounded-full ${i < level ? (level >= 3 ? "bg-quench" : "bg-ember") : "bg-line"}`} />
                ))}
              </div>
              <span className="text-xs font-bold text-mute">{LEVELS[level]}</span>
            </div>
          )}
        </Field>
        <div aria-live="polite">
          {formError && (
            <p role="alert" className="rounded-xl border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-bad">
              {formError}
            </p>
          )}
        </div>
        <button type="submit" disabled={busy} className="btn-ember w-full !py-3.5">
          {busy ? "Creating account…" : "Create account"}
        </button>
        <p className="text-center text-xs leading-relaxed text-mute">Accounts are stored in this browser only. The CodeForge API does not have user accounts yet.</p>
      </form>
    </AuthShell>
  );
}
