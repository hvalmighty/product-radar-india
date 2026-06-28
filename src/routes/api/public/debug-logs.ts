import { createFileRoute } from "@tanstack/react-router";
import { clearDebugLogs, readDebugLogs } from "@/lib/debug-log";

// Token-gated read of the in-memory ring buffer. Set DEBUG_LOGS_TOKEN as a
// Worker secret; client must send ?token=... or X-Debug-Token header.
function authorize(request: Request): Response | null {
  const expected = process.env.DEBUG_LOGS_TOKEN;
  if (!expected) {
    return new Response("DEBUG_LOGS_TOKEN not configured", { status: 503 });
  }
  const url = new URL(request.url);
  const provided = url.searchParams.get("token") ?? request.headers.get("x-debug-token") ?? "";
  if (provided !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}

export const Route = createFileRoute("/api/public/debug-logs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const unauthorized = authorize(request);
        if (unauthorized) return unauthorized;
        return Response.json({
          ok: true,
          serverNow: Date.now(),
          count: readDebugLogs().length,
          logs: readDebugLogs(),
        });
      },
      DELETE: async ({ request }) => {
        const unauthorized = authorize(request);
        if (unauthorized) return unauthorized;
        clearDebugLogs();
        return Response.json({ ok: true });
      },
    },
  },
});
