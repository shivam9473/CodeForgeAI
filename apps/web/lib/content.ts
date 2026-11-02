// All copy comes from the repo's README, docs/ and evals/. Keep it in sync with those files.

// A cooling ramp: white-hot, orange, red, dull steel, quenched blue.
export const RAMP = ["#ffd166", "#ffb347", "#ff7a2f", "#e8553a", "#7c7f9e", "#5aa9d6", "#4fd1e8"];

export type Stage = {
  id: string;
  short: string;
  title: string;
  queue: string;
  source: string;
  after: string;
  body: string;
};

export const STAGES: Stage[] = [
  {
    id: "ingest",
    short: "Ingest",
    title: "Load the source tree",
    queue: "repo-ingestion",
    source: "services/agent-orchestrator",
    after: "Starts the run",
    body: "Reads the files to analyze. By default that is the bundled payment fixture, or the folder you set in FIXTURE_ROOT.",
  },
  {
    id: "analysis",
    short: "Analysis",
    title: "Parse code into structure",
    queue: "code-analysis",
    source: "packages/parser",
    after: "repo-ingestion",
    body: "Babel parses each JS or TS file and extracts function declarations and arrow functions. Calls between them become edges in a dependency graph.",
  },
  {
    id: "embed",
    short: "Embed",
    title: "Index symbols for search",
    queue: "embedding",
    source: "packages/rag",
    after: "code-analysis",
    body: "Splits symbols into chunks and stores them for retrieval. Search runs in memory by default and uses pgvector when you connect Postgres.",
  },
  {
    id: "ai",
    short: "AI",
    title: "Plan, hunt and verify",
    queue: "ai-analysis",
    source: "packages/agents",
    after: "embedding",
    body: "Runs the agent graph: plan the question, explore the files, hunt for suspects, then verify each one. Only confirmed findings leave this step.",
  },
  {
    id: "tests",
    short: "Tests",
    title: "Generate and run tests",
    queue: "test-generation",
    source: "packages/sandbox",
    after: "ai-analysis",
    body: "Writes a test for each finding, checks its syntax, and runs it with the Node test runner in a temporary folder. A failing test gets one retry.",
  },
  {
    id: "review",
    short: "Review",
    title: "Draft review comments",
    queue: "pr-review",
    source: "packages/agents",
    after: "ai-analysis",
    body: "Turns findings into review comments, each with a severity, a file and a line number.",
  },
  {
    id: "docs",
    short: "Docs",
    title: "Write docs and notes",
    queue: "documentation",
    source: "packages/agents",
    after: "ai-analysis",
    body: "Writes documentation for the code it analyzed and saves notes to memory so later runs start with context.",
  },
];

export const STACK = [
  "Next.js",
  "React Flow",
  "Monaco Editor",
  "Babel AST",
  "BullMQ",
  "Redis",
  "Postgres + pgvector",
  "Gemini",
  "WebSocket",
  "Node test runner",
];

export const PILLARS = [
  {
    title: "It reads code as structure.",
    body: "A Babel AST pass pulls out every function and the calls between them, so the hunt follows the real call graph instead of grepping text.",
    icon: "M8 6l-6 6 6 6M16 6l6 6-6 6",
  },
  {
    title: "It retrieves before it reasons.",
    body: "Symbols are chunked and indexed. The agents pull the functions closest to your question rather than reading the whole repository.",
    icon: "M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z",
  },
  {
    title: "It drops what it cannot verify.",
    body: "Every suspect is checked against the parsed code. Only confirmed findings are reported, so the list you read is short and real.",
    icon: "M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6l8-3zM9 12l2 2 4-4",
  },
  {
    title: "It runs the tests it writes.",
    body: "Generated tests are syntax-checked and run in a temporary folder with a stripped environment, then deleted.",
    icon: "M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8",
  },
];

export const AGENTS = [
  {
    name: "Planner",
    fn: "planQuestion",
    body: "Turns your question into a short task list. Uses Gemini when GEMINI_API_KEY is set, and a heuristic planner when it is not.",
  },
  {
    name: "Explorer",
    fn: "explore",
    body: "Labels each file by role (http, domain or data) so the hunt starts with the code closest to the question.",
  },
  {
    name: "Hunter",
    fn: "llmSuspects",
    body: "Asks Gemini to propose suspected bugs. This step is optional and is skipped without a key.",
  },
  {
    name: "Verifier",
    fn: "verifyFindings + staticHunt",
    body: "Checks each suspect against the parsed code and runs its own static hunt. Only confirmed findings ship.",
  },
  {
    name: "Test writer",
    fn: "generateTestsFor",
    body: "Writes a test per finding from Gemini or from a template, then checks and runs it in the sandbox. One retry if it fails.",
  },
  {
    name: "Reviewer",
    fn: "reviewFindings",
    body: "Turns each finding into a review comment with a severity, a file and a line.",
  },
  {
    name: "Doc writer",
    fn: "writeDocs",
    body: "Writes docs for the analyzed code and saves notes to memory for later runs.",
  },
];

export const BUGS = [
  {
    title: "Balance update has no lock",
    tag: "Concurrency",
    question: "Why can payment creation create duplicate transactions?",
  },
  {
    title: "SQL is built with string concat",
    tag: "Injection",
    question: "Find security vulnerabilities in the payment module",
  },
  {
    title: "Amount is not validated",
    tag: "Validation",
    question: "Find missing validation",
  },
  {
    title: "Async controller has no try/catch",
    tag: "Error handling",
    question: "Find error handling bugs",
  },
];

export const RUN_MODES = [
  {
    area: "Queue",
    start: "An in-process MemoryBroker with job dependencies, priorities, exponential backoff and a dead-letter queue.",
    upgrade: "Set REDIS_URL and the same jobs run on BullMQ.",
  },
  {
    area: "Storage",
    start: "An in-memory store for runs, chunks, findings and memory notes.",
    upgrade: "Set DATABASE_URL to keep them in Postgres with pgvector.",
  },
  {
    area: "Model",
    start: "A heuristic planner, a static hunter and template tests. No key needed.",
    upgrade: "Set GEMINI_API_KEY for the LLM planner, hunter, test writer and reviewer.",
  },
];

export const SANDBOX_RULES = [
  {
    title: "A fresh temporary folder",
    body: "Each check writes the generated test into a new temp directory and deletes it afterward, even when the test fails.",
  },
  {
    title: "A stripped environment",
    body: "Only PATH is passed to the child process. GEMINI_API_KEY, DATABASE_URL and the rest of your environment never reach generated code.",
  },
  {
    title: "Syntax before execution",
    body: "node --check runs first. A test that does not parse is rejected before node --test ever starts.",
  },
  {
    title: "Hard time limits",
    body: "A syntax check stops after 5 seconds and a test run after 8 seconds.",
  },
  {
    title: "Capped output",
    body: "Standard output and standard error are each cut at 2,000 characters before they reach the dashboard.",
  },
  {
    title: "One retry, then report",
    body: "The agent graph retries a failing test once. If it still fails, the dashboard shows it as failed.",
  },
];

export const CALL_FLOW = [
  "The dashboard sends POST /repositories/import with your question.",
  "The API creates a run record, answers 202, and starts the pipeline.",
  "A WebSocket at /ws and GET /runs/:id stream step updates back to the browser.",
  "Jobs run in dependency order: ingest, analysis, embedding, AI analysis, then tests, review and docs in parallel.",
  "The agent graph plans, explores, hunts, verifies, writes tests, reviews and documents.",
  "The dashboard shows the graph, the source, the findings, the jobs and the run metrics.",
];

export const FAQ: [string, string][] = [
  [
    "What does CodeForge do?",
    "It imports a codebase, parses it into an AST, retrieves the functions relevant to your question, and hunts for bugs. Each confirmed finding gets a sandboxed test and a review comment, and the run also writes docs.",
  ],
  [
    "Do I need a Gemini API key?",
    "No. Without GEMINI_API_KEY the planner is heuristic, the hunt is static, and tests come from templates. Add a key to turn on the LLM planner, hunter, test writer and reviewer.",
  ],
  [
    "Do I need Docker, Redis or Postgres?",
    "No. By default the API uses an in-process MemoryBroker and an in-memory store. Set REDIS_URL for BullMQ and DATABASE_URL for Postgres, or start both with the compose file in infra/docker.",
  ],
  [
    "Which code does it analyze?",
    "The bundled payment fixture by default. Set FIXTURE_ROOT, or send a root path to POST /repositories/import, to analyze another folder. The parser reads JavaScript and TypeScript.",
  ],
  [
    "Is running generated tests safe?",
    "They run in a temporary folder with a stripped environment and time limits. That is a process-level sandbox, not a container, and it does not block network access. Run the worker in a container or VM if you analyze code you do not trust.",
  ],
  [
    "How do I run it?",
    "Run npm install, copy .env.example to .env, then npm run dev. Open http://localhost:3000, go to the dashboard, and press Run pipeline.",
  ],
  [
    "How do I check the hunter is any good?",
    "Run npm run eval. It runs the static hunter on the payment fixture and checks that each of four expected bugs is found, then prints the recall.",
  ],
];
