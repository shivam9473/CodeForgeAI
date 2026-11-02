import Link from "next/link";
import type { ReactNode } from "react";
import { AGENTS, BUGS, FAQ, PILLARS, RUN_MODES, STACK } from "@/lib/content";

export function SectionHead({ title, sub, align = "center" }: { title: string; sub?: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <h2 className="text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">{title}</h2>
      {sub && <p className="mt-4 text-lg leading-relaxed text-mute">{sub}</p>}
    </div>
  );
}

export function PageHero({ title, sub, children }: { title: string; sub: string; children?: ReactNode }) {
  return (
    <section className="hero-glow border-b border-line px-6 pt-20 pb-16">
      <div className="mx-auto max-w-7xl">
        <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight md:text-6xl">{title}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-mute">{sub}</p>
        {children}
      </div>
    </section>
  );
}

export function StackRow() {
  return (
    <section className="border-y border-line bg-ink-2 px-6 py-8" aria-label="Built with">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-3">
        <span className="mr-2 text-sm font-medium text-mute">Built with</span>
        {STACK.map((name) => (
          <span key={name} className="rounded-full border border-line bg-panel/70 px-4 py-1.5 text-sm font-medium">
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}

export function Pillars() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHead
          title="Every finding is checked before you see it."
          sub="Four design choices keep the noise down and the evidence close."
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((item) => (
            <div key={item.title} className="card p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ember/12 text-ember-hot">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={item.icon} />
                </svg>
              </span>
              <h3 className="mt-5 text-lg font-bold leading-snug">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mute">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BugCases() {
  return (
    <section className="border-t border-line bg-ink-2 px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHead
          title="Checked against four known payment bugs."
          sub="The bundled payment fixture has four seeded defects. The eval runs the static hunter and confirms it finds each one."
        />
        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {BUGS.map((bug) => (
            <div key={bug.title} className="card p-6">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-lg font-bold leading-snug">{bug.title}</h3>
                <span className="flex-none rounded-full border border-line px-3 py-1 text-xs font-medium text-mute">{bug.tag}</span>
              </div>
              <p className="mt-4 rounded-lg border border-line bg-ink px-4 py-3 font-mono text-xs leading-relaxed text-mute">
                <span className="text-quench">ask</span> {bug.question}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-mute">
          Run <code className="rounded bg-panel px-2 py-1 font-mono text-paper">npm run eval</code> to score it yourself.
        </p>
      </div>
    </section>
  );
}

export function RunModes() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHead title="Start small. Add pieces when you need them." sub="Queue, storage and model are three independent switches." />
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {RUN_MODES.map((mode) => (
            <div key={mode.area} className="card flex flex-col p-6">
              <h3 className="text-xl font-extrabold">{mode.area}</h3>
              <p className="mt-4 text-xs font-bold text-mute">Default</p>
              <p className="mt-1 text-sm leading-relaxed">{mode.start}</p>
              <p className="mt-5 text-xs font-bold text-ember-hot">To upgrade</p>
              <p className="mt-1 text-sm leading-relaxed text-mute">{mode.upgrade}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AgentList() {
  return (
    <ol className="space-y-3">
      {AGENTS.map((agent, i) => (
        <li key={agent.name} className="card grid gap-4 p-6 sm:grid-cols-[3rem_1fr] sm:items-start">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ember/12 font-mono text-sm font-medium text-ember-hot">{i + 1}</span>
          <div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-xl font-bold">{agent.name}</h3>
              <code className="font-mono text-xs text-mute">{agent.fn}</code>
            </div>
            <p className="mt-2 leading-relaxed text-mute">{agent.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function FaqList({ limit }: { limit?: number }) {
  const rows = limit ? FAQ.slice(0, limit) : FAQ;
  return (
    <div className="space-y-3">
      {rows.map(([q, a]) => (
        <details key={q} className="card group px-6 py-5">
          <summary className="flex cursor-pointer items-center justify-between gap-4 text-left font-bold">
            {q}
            <span className="text-xl text-ember transition-transform group-open:rotate-45" aria-hidden="true">
              +
            </span>
          </summary>
          <p className="mt-3 leading-relaxed text-mute">{a}</p>
        </details>
      ))}
    </div>
  );
}

export function FinalCta() {
  return (
    <section className="cta-glow border-t border-line px-6 py-24 text-center">
      <h2 className="mx-auto max-w-3xl text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
        Run it on the payment fixture in a minute.
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-lg text-mute">One command starts the API, the worker and the dashboard.</p>
      <pre className="mx-auto mt-8 w-fit max-w-full overflow-x-auto rounded-xl border border-line bg-ink px-6 py-4 text-left font-mono text-sm">
        <code>
          <span className="text-mute">$ </span>npm install && npm run dev
        </code>
      </pre>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/dashboard" className="btn-ember">
          Open the dashboard
        </Link>
        <Link href="/signup" className="btn-ghost">
          Create an account
        </Link>
      </div>
    </section>
  );
}
