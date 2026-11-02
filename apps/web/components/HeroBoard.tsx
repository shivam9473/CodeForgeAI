import Ingot from "./Ingot";

const CODE: { text: string; hot?: boolean }[] = [
  { text: "export async function transferMoney(db, from, to, amount) {" },
  { text: "  const sender = await db.getBalance(from);", hot: true },
  { text: "  const receiver = await db.getBalance(to);", hot: true },
  { text: "  await db.setBalance(from, sender - amount);", hot: true },
  { text: "  await db.setBalance(to, receiver + amount);", hot: true },
  { text: "  return { from, to, amount };" },
  { text: "}" },
];

const KEYWORDS = /\b(export|async|function|const|await|return)\b/;

function Highlight({ text }: { text: string }) {
  return (
    <>
      {text.split(KEYWORDS).map((part, i) =>
        KEYWORDS.test(part) ? (
          <span key={i} className="text-quench">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export default function HeroBoard() {
  return (
    <div>
      <div className="card overflow-hidden shadow-[0_40px_120px_-40px_rgb(255_122_47/0.5)]">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <span className="truncate font-mono text-xs text-mute">fixtures/payment/service.js</span>
          <span className="flex-none rounded-full bg-bad/15 px-3 py-1 text-xs font-bold text-bad">critical</span>
        </div>
        <pre className="overflow-x-auto py-4 font-mono text-[13px] leading-7" aria-label="Source with the flagged lines highlighted">
          {CODE.map((line, i) => (
            <div key={i} className={`grid grid-cols-[3rem_1fr] ${line.hot ? "bg-ember/10" : ""}`}>
              <span className={`select-none pr-4 text-right ${line.hot ? "text-ember-hot" : "text-mute/60"}`}>{i + 1}</span>
              <code className={`whitespace-pre pr-5 pl-3 ${line.hot ? "border-l-2 border-ember" : "border-l-2 border-transparent"}`}>
                <Highlight text={line.text} />
              </code>
            </div>
          ))}
        </pre>
        <div className="border-t border-line bg-ink/50 p-5">
          <p className="text-sm font-bold">Balance update has no lock</p>
          <p className="mt-1 text-sm leading-relaxed text-mute">
            Both balances are read, then written back. Two transfers at the same time can overwrite each other.
          </p>
        </div>
        <div className="border-t border-line p-5">
          <Ingot />
        </div>
        <dl className="grid grid-cols-3 divide-x divide-line border-t border-line text-center">
          {[
            ["Finding", "verified"],
            ["Test", "generated"],
            ["Review", "drafted"],
          ].map(([label, value]) => (
            <div key={label} className="px-2 py-3.5">
              <dt className="text-xs text-mute">{label}</dt>
              <dd className="mt-0.5 text-sm font-bold text-quench">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="mt-3 text-center text-xs text-mute">Sample output for the bundled payment fixture.</p>
    </div>
  );
}
