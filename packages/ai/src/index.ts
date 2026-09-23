export type GeminiResult = {
  text: string;
  tokensIn: number;
  tokensOut: number;
  model: string;
  latencyMs: number;
  costUsd: number;
};

const COST_PER_1K_IN = 0.0001;
const COST_PER_1K_OUT = 0.0004;

export function hasGemini(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export async function generateText(prompt: string, system = "You are CodeForge, an autonomous software engineer."): Promise<GeminiResult> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY is missing. Set it in .env for LLM agents.");
  }
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const started = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  const tokensIn = json.usageMetadata?.promptTokenCount || Math.ceil((system.length + prompt.length) / 4);
  const tokensOut = json.usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4);
  const costUsd = Number(((tokensIn / 1000) * COST_PER_1K_IN + (tokensOut / 1000) * COST_PER_1K_OUT).toFixed(6));
  return {
    text,
    tokensIn,
    tokensOut,
    model,
    latencyMs: Date.now() - started,
    costUsd,
  };
}

export async function generateJson<T>(prompt: string, system?: string): Promise<{ data: T; meta: GeminiResult }> {
  const meta = await generateText(
    `${prompt}\n\nReturn ONLY valid JSON. No markdown fences.`,
    system
  );
  const cleaned = meta.text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  return { data: JSON.parse(cleaned) as T, meta };
}
