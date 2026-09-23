import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type SandboxResult = { ok: boolean; code: number | null; stdout: string; stderr: string };

function runNode(args: string[], cwd: string, timeoutMs: number): Promise<SandboxResult> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd,
      env: {
        PATH: process.env.PATH,
        NODE_OPTIONS: "",
      },
      timeout: timeoutMs,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (buf) => {
      stdout += buf.toString();
    });
    child.stderr.on("data", (buf) => {
      stderr += buf.toString();
    });
    child.on("close", (code) => {
      resolve({ ok: code === 0, code, stdout: stdout.slice(0, 2000), stderr: stderr.slice(0, 2000) });
    });
    child.on("error", (error) => {
      resolve({ ok: false, code: null, stdout, stderr: error.message });
    });
  });
}

export async function checkSyntax(source: string, timeoutMs = 5000): Promise<SandboxResult> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codeforge-"));
  const file = path.join(dir, "generated.test.js");
  try {
    fs.writeFileSync(file, source);
    return await runNode(["--check", file], dir, timeoutMs);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export async function runTests(source: string, timeoutMs = 8000): Promise<SandboxResult> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codeforge-"));
  const file = path.join(dir, "generated.test.js");
  try {
    fs.writeFileSync(file, source);
    const syntax = await runNode(["--check", file], dir, timeoutMs);
    if (!syntax.ok) return syntax;
    return await runNode(["--test", file], dir, timeoutMs);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
