import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { createThread } from "@/lib/assistant-store";

export const Route = createFileRoute("/assistant/")({
  component: AssistantIndex,
});

function AssistantIndex() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = createThread();
    navigate({ to: "/assistant/$threadId", params: { threadId: t.id }, replace: true });
  }, [navigate]);
  return (
    <div className="flex-1 grid place-items-center text-muted-foreground">
      <div className="flex items-center gap-2 text-sm">
        <Sparkles className="h-4 w-4" /> Starting a new conversation…
      </div>
    </div>
  );
}
