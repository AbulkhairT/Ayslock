import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let cached: { dir: string; ephemeral: boolean } | null = null;

function writable(dir: string) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Where local demo mode keeps its database and signing secret.
 * Locally: .data/ in the project. On read-only hosts (Vercel, other serverless),
 * the project folder can't be written, so fall back to the temp directory. That copy
 * is temporary: it resets when the server instance restarts.
 */
export function demoStorage(): { dir: string; ephemeral: boolean } {
  if (cached) return cached;
  const configured = process.env.PGLITE_DIR;
  if (configured) {
    return (cached = { dir: configured.startsWith("memory://") ? configured : path.resolve(/*turbopackIgnore: true*/ process.cwd(), configured), ephemeral: configured.startsWith("memory://") });
  }
  const serverless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
  const local = path.resolve(/*turbopackIgnore: true*/ process.cwd(), ".data", "pglite");
  if (!serverless && writable(local)) return (cached = { dir: local, ephemeral: false });
  return (cached = { dir: path.join(os.tmpdir(), "ayslock-demo", "pglite"), ephemeral: true });
}
