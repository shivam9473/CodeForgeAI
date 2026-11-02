"use client";

import { useState } from "react";
import { RAMP, STAGES } from "@/lib/content";

export default function PipelineExplorer() {
  const [active, setActive] = useState(0);
  const stage = STAGES[active];
  const parallel = ["test-generation", "pr-review", "documentation"].includes(stage.queue);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[19rem_1fr]">
      <div role="tablist" aria-label="Pipeline jobs" aria-orientation="vertical" className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
        {STAGES.map((item, i) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`stage-tab-${item.id}`}
            aria-selected={active === i}
            aria-controls="stage-panel"
            onClick={() => setActive(i)}
            className={`flex flex-none items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors lg:flex-auto ${
              active === i ? "border-line bg-panel-2" : "border-transparent hover:bg-panel/60"
            }`}
          >
            <span className="h-8 w-1.5 flex-none rounded-full" style={{ background: RAMP[i] }} />
            <span className="min-w-0">
              <span className="block text-sm font-bold">
                {i + 1}. {item.short}
              </span>
              <span className="block truncate font-mono text-xs text-mute">{item.queue}</span>
            </span>
          </button>
        ))}
      </div>

      <div id="stage-panel" role="tabpanel" aria-labelledby={`stage-tab-${stage.id}`} className="card overflow-hidden">
        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${RAMP[active]}, ${RAMP[Math.min(active + 1, RAMP.length - 1)]})` }} />
        <div className="p-7 md:p-9">
          <h3 className="text-2xl font-extrabold tracking-tight md:text-3xl">{stage.title}</h3>
          <p className="mt-3 max-w-xl text-lg leading-relaxed text-mute">{stage.body}</p>
          <dl className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ["Queue", stage.queue],
              ["Code", stage.source],
              ["Runs after", parallel ? `${stage.after}, alongside the other two` : stage.after],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line bg-ink/60 p-4">
                <dt className="text-xs text-mute">{label}</dt>
                <dd className="mt-1.5 break-words font-mono text-sm">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-sm leading-relaxed text-mute">
            Every job retries with exponential backoff and moves to a dead-letter queue if it keeps failing.
          </p>
        </div>
      </div>
    </div>
  );
}
