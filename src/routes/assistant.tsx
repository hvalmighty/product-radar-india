import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Plus, MessageSquare, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createThread, deleteThread, useThreads } from "@/lib/assistant-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "mPower AI — Wealth Assistant" },
      { name: "description", content: "Ask contextual questions about your book, families and client portfolios." },
    ],
  }),
  component: AssistantLayout,
});

function AssistantLayout() {
  const navigate = useNavigate();
  const threads = useThreads();
  const path = useRouterState({ select: (r) => r.location.pathname });

  const newChat = () => {
    const t = createThread();
    navigate({ to: "/assistant/$threadId", params: { threadId: t.id } });
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0 bg-background">
      <aside className="w-64 shrink-0 border-r border-border flex flex-col bg-muted/30">
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 grid place-items-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold leading-tight">mPower AI</div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground leading-tight">Wealth assistant</div>
            </div>
          </div>
          <Button size="sm" className="w-full justify-start gap-2" onClick={newChat}>
            <Plus className="h-4 w-4" /> New chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {threads.length === 0 && (
              <div className="text-[11px] text-muted-foreground px-2 py-6 text-center">
                No conversations yet. Start a new chat.
              </div>
            )}
            {threads.map((t) => {
              const active = path.endsWith(`/assistant/${t.id}`);
              return (
                <div
                  key={t.id}
                  className={cn(
                    "group flex items-center rounded-md text-xs",
                    active ? "bg-background shadow-sm" : "hover:bg-background/60",
                  )}
                >
                  <Link
                    to="/assistant/$threadId"
                    params={{ threadId: t.id }}
                    className="flex-1 flex items-center gap-2 px-2 py-2 min-w-0"
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{t.title}</span>
                  </Link>
                  <button
                    type="button"
                    aria-label="Delete chat"
                    className="opacity-0 group-hover:opacity-100 p-1.5 mr-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      deleteThread(t.id);
                      if (active) navigate({ to: "/assistant" });
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <div className="p-3 border-t border-border text-[10px] text-muted-foreground leading-relaxed">
          Answers grounded in the loaded sample portfolios. History clears on refresh.
        </div>
      </aside>
      <main className="flex-1 min-w-0 min-h-0 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
