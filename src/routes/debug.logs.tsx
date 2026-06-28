import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogEntry {
  id: string;
  at: number;
  level: "info" | "warn" | "error";
  source: string;
  message: string;
  data?: unknown;
}

export const Route = createFileRoute("/debug/logs")({
  component: DebugLogsPage,
});

const TOKEN_KEY = "mpower:debug-token";

function DebugLogsPage() {
  const [token, setToken] = useState(() =>
    typeof window === "undefined" ? "" : window.localStorage.getItem(TOKEN_KEY) ?? "",
  );
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<string>("");
  const [auto, setAuto] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setStatus("Enter your DEBUG_LOGS_TOKEN to fetch logs.");
      return;
    }
    setStatus("Loading…");
    try {
      const r = await fetch(`/api/public/debug-logs?token=${encodeURIComponent(token)}`);
      if (!r.ok) {
        setStatus(`${r.status} ${r.statusText} — ${await r.text()}`);
        return;
      }
      const json = (await r.json()) as { logs: LogEntry[] };
      setLogs(json.logs);
      setStatus(`Loaded ${json.logs.length} entries at ${new Date().toLocaleTimeString()}`);
    } catch (e) {
      setStatus(`Fetch failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [token]);

  const clear = useCallback(async () => {
    if (!token) return;
    await fetch(`/api/public/debug-logs?token=${encodeURIComponent(token)}`, { method: "DELETE" });
    await load();
  }, [token, load]);

  useEffect(() => {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
  }, [token]);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [auto, load]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Worker debug logs</h1>
        <p className="text-xs text-muted-foreground">
          Live ring buffer (last 200) of chat / Gemini activity from the running Cloudflare Worker isolate.
          Cleared on cold start. Requires the <code>DEBUG_LOGS_TOKEN</code> Worker secret.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Input
          type="password"
          placeholder="DEBUG_LOGS_TOKEN"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={load} size="sm" variant="default">
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Fetch
        </Button>
        <Button onClick={clear} size="sm" variant="outline">
          <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
        </Button>
        <label className="text-xs inline-flex items-center gap-1.5 ml-2">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          Auto-refresh (3s)
        </label>
        <span className="text-xs text-muted-foreground ml-auto">{status}</span>
      </div>

      <div className="border border-border rounded-md divide-y divide-border text-xs font-mono">
        {logs.length === 0 && (
          <div className="p-4 text-muted-foreground">No log entries.</div>
        )}
        {logs.map((l) => (
          <div key={l.id} className="p-2.5">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] uppercase",
                  l.level === "error" && "bg-destructive/15 text-destructive",
                  l.level === "warn" && "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
                  l.level === "info" && "bg-muted text-muted-foreground",
                )}
              >
                {l.level}
              </span>
              <span className="text-muted-foreground">{new Date(l.at).toLocaleTimeString()}</span>
              <span className="font-semibold">{l.source}</span>
              <span>{l.message}</span>
            </div>
            {l.data !== undefined && (
              <pre className="mt-1 whitespace-pre-wrap break-all text-[11px] text-muted-foreground">
                {typeof l.data === "string" ? l.data : JSON.stringify(l.data, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
