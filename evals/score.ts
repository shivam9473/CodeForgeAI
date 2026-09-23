import path from "node:path";
import { fileURLToPath } from "node:url";
import { staticHunt } from "@codeforge/agents";
import { parseFiles, readSourceTree } from "@codeforge/parser";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures/payment");
const dataset = [
  { id: "pay-race", expectTitle: "Balance update has no lock" },
  { id: "pay-sql", expectTitle: "SQL is built with string concat" },
  { id: "pay-amount", expectTitle: "Amount is not validated" },
  { id: "pay-try", expectTitle: "Async controller has no try/catch" },
];

const findings = staticHunt(parseFiles(readSourceTree(root)));
const titles = new Set(findings.map((item) => item.title));

let hit = 0;
for (const row of dataset) {
  const ok = titles.has(row.expectTitle);
  if (ok) hit += 1;
  console.log(`${ok ? "pass" : "fail"} ${row.id}`);
}
console.log(`recall ${hit}/${dataset.length}`);
process.exit(hit === dataset.length ? 0 : 1);
