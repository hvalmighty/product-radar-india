// In-memory ring buffer for diagnostic logs (chat / Gemini / auth errors).
// Lives in the Worker isolate — cleared on cold start. Good enough to debug
// "what just happened in production" without a real log backend.

export type DebugLogLevel = "info" | "warn" | "error";

export interface DebugLogEntry {
  id: string;
  at: number;
  level: DebugLogLevel;
  source: string;
  message: string;
  data?: unknown;
}

const MAX = 200;
const buffer: DebugLogEntry[] = [];

export function pushDebugLog(entry: Omit<DebugLogEntry, "id" | "at">) {
  const e: DebugLogEntry = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    at: Date.now(),
    ...entry,
  };
  buffer.push(e);
  if (buffer.length > MAX) buffer.splice(0, buffer.length - MAX);
  // Also mirror to console so Cloudflare tail captures it.
  const line = `[${e.source}] ${e.message}`;
  if (e.level === "error") console.error(line, e.data ?? "");
  else if (e.level === "warn") console.warn(line, e.data ?? "");
  else console.log(line, e.data ?? "");
}

export function readDebugLogs(limit = MAX): DebugLogEntry[] {
  return buffer.slice(-limit).reverse();
}

export function clearDebugLogs() {
  buffer.length = 0;
}

function safeSerialize(value: unknown, max = 4000): unknown {
  try {
    const s = typeof value === "string" ? value : JSON.stringify(value);
    if (!s) return value;
    return s.length > max ? s.slice(0, max) + `…[truncated ${s.length - max}b]` : s;
  } catch {
    return String(value);
  }
}

export function serializeError(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack?.split("\n").slice(0, 8).join("\n"),
      cause: err.cause ? safeSerialize(err.cause) : undefined,
    };
  }
  return safeSerialize(err);
}
