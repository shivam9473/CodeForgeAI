import type { Metadata } from "next";
import Ingot from "@/components/Ingot";
import PipelineExplorer from "@/components/PipelineExplorer";
import { FinalCta, PageHero, RunModes, SectionHead } from "@/components/Sections";
import { CALL_FLOW } from "@/lib/content";

export const metadata: Metadata = { title: "Pipeline" };

export default function PipelinePage() {
  return (
    <main>
      <PageHero
        title="From import to review in seven jobs."
        sub="Each job is a queue with its own retries. Later jobs wait for the ones they depend on, and the last three run in parallel."
      >
        <div className="mt-10 max-w-2xl">
          <Ingot tall />
        </div>
      </PageHero>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <PipelineExplorer />
        </div>
      </section>

      <section className="border-t border-line bg-ink-2 px-6 py-24">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 lg:grid-cols-[1fr_1.2fr]">
          <SectionHead align="left" title="What happens when you press Run pipeline." sub="The same path every time, from the browser to the dashboard." />
          <ol className="space-y-3">
            {CALL_FLOW.map((step, i) => (
              <li key={step} className="card flex gap-4 p-5">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-ember/12 font-mono text-sm text-ember-hot">{i + 1}</span>
                <p className="leading-relaxed text-mute">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <RunModes />
      <FinalCta />
    </main>
  );
}
