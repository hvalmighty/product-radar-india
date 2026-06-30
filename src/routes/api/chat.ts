import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { buildSystemPrompt } from "@/lib/assistant-context";
import { pushDebugLog, serializeError } from "@/lib/debug-log";

type Region = "IN" | "AE" | "PH";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startedAt = Date.now();
        let messages: UIMessage[] | undefined;
        let region: Region = "IN";
        try {
          const body = (await request.json()) as { messages?: UIMessage[]; region?: Region };
          messages = body.messages;
          if (body.region === "IN" || body.region === "AE" || body.region === "PH") region = body.region;
        } catch (err) {
          pushDebugLog({ level: "error", source: "chat", message: "invalid json body", data: serializeError(err) });
          return new Response("invalid json", { status: 400 });
        }

        if (!Array.isArray(messages)) {
          pushDebugLog({ level: "warn", source: "chat", message: "missing messages array" });
          return new Response("messages required", { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) {
          pushDebugLog({
            level: "error",
            source: "chat",
            message: "Missing GEMINI_API_KEY in process.env",
            data: { envKeys: Object.keys(process.env ?? {}).filter((k) => !/SECRET|KEY|TOKEN/i.test(k)) },
          });
          return new Response("Missing GEMINI_API_KEY", { status: 500 });
        }

        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        const lastUserText = lastUser?.parts.map((p) => (p.type === "text" ? p.text : "")).join("") ?? "";
        pushDebugLog({
          level: "info",
          source: "gemini",
          message: `request → gemini-2.5-flash (${messages.length} msgs)`,
          data: { keyTail: apiKey.slice(-4), lastUserPreview: lastUserText.slice(0, 200) },
        });

        try {
          const google = createGoogleGenerativeAI({ apiKey });
          const result = streamText({
            model: google("gemini-2.5-flash"),
            system: buildSystemPrompt(region),
            messages: await convertToModelMessages(messages),
            onError: ({ error }) => {
              pushDebugLog({
                level: "error",
                source: "gemini",
                message: "stream error",
                data: serializeError(error),
              });
            },
            onFinish: ({ usage, finishReason }) => {
              pushDebugLog({
                level: "info",
                source: "gemini",
                message: `finished (${finishReason}) in ${Date.now() - startedAt}ms`,
                data: { usage },
              });
            },
          });

          return result.toUIMessageStreamResponse({ originalMessages: messages });
        } catch (err) {
          pushDebugLog({
            level: "error",
            source: "gemini",
            message: "request failed before stream",
            data: serializeError(err),
          });
          return new Response("Upstream error: " + (err instanceof Error ? err.message : String(err)), {
            status: 502,
          });
        }
      },
    },
  },
});
