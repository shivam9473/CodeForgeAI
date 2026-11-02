"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import Logo from "./Logo";

const POINTS = ["See every finding with its evidence", "Watch the seven jobs run live", "Read the generated test and the review comment"];

export default function AuthShell({ title, sub, children, footer }: { title: string; sub: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="grid min-h-[calc(100vh-7rem)] lg:grid-cols-[1.05fr_1fr]">
      <aside className="hero-glow relative hidden flex-col justify-between overflow-hidden border-r border-line bg-ink-2 p-12 lg:flex">
        <Link href="/" aria-label="CodeForge home">
          <Logo />
        </Link>
        <div>
          <p className="max-w-md text-4xl font-extrabold leading-tight tracking-tight">Bug reports you can trust, with the tests already run.</p>
          <ul className="mt-8 space-y-4">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-mute">
                <span className="mt-1 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-quench/15 text-[11px] font-bold text-quench">✓</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div className="card max-w-sm p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate font-mono text-xs text-mute">fixtures/payment/service.js</span>
            <span className="flex-none rounded-full bg-bad/15 px-2.5 py-0.5 text-[11px] font-bold text-bad">critical</span>
          </div>
          <p className="mt-3 text-sm font-bold">Balance update has no lock</p>
          <p className="mt-1 text-xs leading-relaxed text-mute">Two transfers at the same time can overwrite each other.</p>
        </div>
      </aside>

      <section className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-2 text-mute">{sub}</p>
          <div className="mt-8">{children}</div>
          {footer && <p className="mt-8 text-center text-sm text-mute">{footer}</p>}
        </div>
      </section>
    </main>
  );
}

export function Field({ label, id, error, hint, children }: { label: string; id: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-bad">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-mute">{hint}</p>
      )}
    </div>
  );
}

export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={shown ? "text" : "password"}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="input pr-16"
      />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        className="absolute inset-y-0 right-3 my-auto h-8 rounded-lg px-2 text-xs font-bold text-mute hover:text-paper"
      >
        {shown ? "Hide" : "Show"}
      </button>
    </div>
  );
}
