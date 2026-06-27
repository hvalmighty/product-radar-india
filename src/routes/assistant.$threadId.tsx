import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowUp, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getOrCreateThread, updateThread } from "@/lib/assistant-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assistant/$threadId")({
  component: ChatPage,
});

const SUGGESTIONS = [
  "What is my total book AUM and how is it split by family?",
  "Which portfolios are over-concentrated in a single issuer?",
  "Show me every portfolio holding Reliance Industries.",
  "Compare the Sharma vs Patel family on equity vs debt allocation.",
  "Which clients are debt-heavy and could be cross-sold equity ideas?",
];

function ChatPage() {
  const { threadId } = Route.useParams();
  const thread = useMemo(() => getOrCreateThread(threadId), [threadId]);
  const [input, setInput] = useState("");
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: thread.messages,
    transport,
  });

  // Persist messages back to the in-memory thread + auto-title from first user msg.
  useEffect(() => {
    updateThread(threadId, {
      messages: messages as UIMessage[],
      title:
        messages.find((m) => m.role === "user")
          ? (messages.find((m) => m.role === "user")!.parts
              .map((p) => (p.type === "text" ? p.text : ""))
              .join(" ")
              .slice(0, 40) || "New chat")
          : "New chat",
    });
  }, [messages, threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    taRef.current?.focus();
  }, [threadId, status]);

  const isLoading = status === "submitted" || status === "streaming";

  const submit = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage({ text });
  };

  const empty = messages.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        {empty ? (
          <div className="max-w-2xl mx-auto px-6 pt-16 pb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 grid place-items-center shadow-lg shadow-violet-500/20">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">mPower AI assistant</h1>
                <p className="text-xs text-muted-foreground">
                  Grounded in the loaded sample portfolios — ask about business or any specific client.
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => sendMessage({ text: s })}
                  className="text-left text-xs px-3 py-3 rounded-lg border border-border hover:border-foreground/30 hover:bg-muted/40 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
            {messages.map((m) => {
              const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
              return (
                <div key={m.id} className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}>
                  {m.role !== "user" && (
                    <div className="h-7 w-7 shrink-0 rounded-md bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 grid place-items-center mt-0.5">
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                  {m.role === "user" ? (
                    <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-3.5 py-2 text-sm whitespace-pre-wrap">
                      {text}
                    </div>
                  ) : (
                    <div className="max-w-[85%] text-sm text-foreground prose prose-sm dark:prose-invert prose-headings:font-semibold prose-p:my-2 prose-table:my-2 prose-table:text-xs prose-th:px-2 prose-td:px-2 prose-th:py-1 prose-td:py-1 prose-th:border prose-td:border prose-th:border-border prose-td:border-border prose-li:my-0.5 prose-pre:bg-muted prose-pre:text-foreground">
                      {text ? <ReactMarkdown>{text}</ReactMarkdown> : <span className="inline-flex items-center gap-1.5 text-muted-foreground text-xs"><Loader2 className="h-3 w-3 animate-spin" /> Thinking…</span>}
                    </div>
                  )}
                </div>
              );
            })}
            {status === "submitted" && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3 justify-start">
                <div className="h-7 w-7 shrink-0 rounded-md bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 grid place-items-center mt-0.5">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5 pt-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
                </div>
              </div>
            )}
            {error && (
              <div className="text-xs text-destructive border border-destructive/30 rounded-md px-3 py-2 bg-destructive/5">
                {error.message || "Request failed. Please retry."}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-border bg-background/80 backdrop-blur">
        <div className="max-w-3xl mx-auto px-6 py-3">
          <div className="relative rounded-2xl border border-border bg-background focus-within:ring-2 focus-within:ring-ring/40">
            <Textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Ask about your book, a family, a client or a security…"
              rows={1}
              className="min-h-[48px] max-h-40 resize-none border-0 bg-transparent focus-visible:ring-0 pr-12 py-3 text-sm"
            />
            <Button
              type="button"
              size="icon"
              disabled={!input.trim() || isLoading}
              onClick={submit}
              className="absolute right-2 bottom-2 h-8 w-8 rounded-full"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </Button>
          </div>
          <div className="text-[10px] text-muted-foreground text-center mt-1.5">
            mPower AI may make mistakes — verify critical numbers in the underlying reports.
          </div>
        </div>
      </div>
    </div>
  );
}
