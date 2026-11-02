import type { Metadata } from "next";
import { AgentList, BugCases, FinalCta, PageHero, SectionHead } from "@/components/Sections";

export const metadata: Metadata = { title: "Agents" };

export default function AgentsPage() {
  return (
    <main>
      <PageHero
        title="Seven agents, one verified answer."
        sub="The agent graph is a state machine. Each step hands a smaller, better-checked set of findings to the next one."
      />

      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <SectionHead align="left" title="Works with or without a model." sub="Gemini powers the planner, hunter, test writer and reviewer when you set a key." />
            <div className="card mt-8 p-6">
              <h3 className="font-bold">No key set</h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-mute">
                <li>The planner falls back to heuristic tasks.</li>
                <li>The hunter is skipped and the static hunt does the work.</li>
                <li>Tests come from templates instead of the model.</li>
              </ul>
            </div>
          </div>
          <AgentList />
        </div>
      </section>

      <BugCases />
      <FinalCta />
    </main>
  );
}
