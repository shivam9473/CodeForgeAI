import Link from "next/link";
import HeroBoard from "@/components/HeroBoard";
import PipelineExplorer from "@/components/PipelineExplorer";
import { BugCases, FaqList, FinalCta, Pillars, RunModes, SectionHead, StackRow } from "@/components/Sections";

export default function Landing() {
  return (
    <main>
      <section className="hero-glow overflow-hidden px-6 pt-16 pb-24 md:pt-24">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
          <div className="min-w-0">
            <h1 className="text-[2.6rem] font-extrabold leading-[1.05] tracking-tight md:text-6xl lg:text-[4.25rem]">
              Bug reports you can trust, with the tests already run.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-mute">
              CodeForge reads your code as an AST, retrieves the functions that matter, and drops any finding it cannot verify. Each confirmed bug comes with a
              sandboxed test and a review comment.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/dashboard" className="btn-ember">
                Open the dashboard
              </Link>
              <Link href="/pipeline" className="btn-ghost">
                See how it works
              </Link>
            </div>
            <ul className="mt-9 space-y-2.5 text-sm text-mute">
              {["Starts with one command", "Works without a Gemini key", "Live progress over WebSocket"].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-quench/15 text-[11px] font-bold text-quench">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0">
            <HeroBoard />
          </div>
        </div>
      </section>

      <StackRow />
      <Pillars />

      <section className="border-t border-line bg-ink-2 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHead title="One run, seven jobs." sub="Each job is a queue with its own retries. Pick a stage to see what it does." />
          <div className="mt-14">
            <PipelineExplorer />
          </div>
        </div>
      </section>

      <BugCases />
      <RunModes />

      <section className="border-t border-line bg-ink-2 px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <SectionHead title="Questions?" />
          <div className="mt-12">
            <FaqList limit={4} />
          </div>
          <p className="mt-8 text-center">
            <Link href="/faq" className="font-bold text-ember-hot hover:underline">
              See all questions
            </Link>
          </p>
        </div>
      </section>

      <FinalCta />
    </main>
  );
}
