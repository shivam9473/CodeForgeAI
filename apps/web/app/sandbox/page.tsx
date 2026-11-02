import type { Metadata } from "next";
import { FinalCta, PageHero, SectionHead } from "@/components/Sections";
import { SANDBOX_RULES } from "@/lib/content";

export const metadata: Metadata = { title: "Sandbox" };

export default function SandboxPage() {
  return (
    <main>
      <PageHero
        title="Generated tests run in a sandbox. Here is exactly what that means."
        sub="CodeForge never runs a test it has not syntax-checked, and it never hands generated code your environment variables."
      />

      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHead title="What the sandbox does." sub="Six rules, all visible in packages/sandbox." />
          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {SANDBOX_RULES.map((rule) => (
              <div key={rule.title} className="card p-6">
                <h3 className="flex items-center gap-2.5 text-lg font-bold">
                  <span className="h-2 w-2 flex-none rounded-full bg-quench" />
                  {rule.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-mute">{rule.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-ink-2 px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-warn/40 bg-warn/5 p-8">
            <h2 className="text-2xl font-extrabold tracking-tight">What it does not do.</h2>
            <p className="mt-3 leading-relaxed text-mute">
              This is a process-level sandbox, not a container. The test runs as a child Node process on the same machine. It does not block network access and it
              does not stop code from reading files outside the temporary folder.
            </p>
            <p className="mt-3 leading-relaxed text-mute">
              If you point CodeForge at code you do not trust, run the worker inside a container or a VM.
            </p>
          </div>
        </div>
      </section>

      <FinalCta />
    </main>
  );
}
