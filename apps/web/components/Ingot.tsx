import type { CSSProperties } from "react";
import { RAMP, STAGES } from "@/lib/content";

// The signature element: seven pipeline jobs drawn as one bar of metal cooling from white-hot to quenched.
export default function Ingot({ tall = false }: { tall?: boolean }) {
  return (
    <ol className="grid grid-cols-7 gap-1.5" aria-label="Pipeline jobs in order">
      {STAGES.map((stage, i) => (
        <li key={stage.id} className="min-w-0">
          <div
            className="seg rounded-md"
            style={{ "--i": i, background: RAMP[i], height: tall ? 36 : 24 } as CSSProperties}
          />
          <span className="mt-2 block truncate text-center text-[10px] font-medium text-mute sm:text-xs">{stage.short}</span>
        </li>
      ))}
    </ol>
  );
}
