// In-memory thread store for the mPower AI assistant.
// No persistence — threads are lost on refresh (per user choice).

import type { UIMessage } from "ai";
import { useSyncExternalStore } from "react";

export type AssistantThread = {
  id: string;
  title: string;
  createdAt: number;
  messages: UIMessage[];
};

const threads = new Map<string, AssistantThread>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function makeId() {
  return `t_${Math.random().toString(36).slice(2, 10)}`;
}

export function createThread(): AssistantThread {
  const t: AssistantThread = {
    id: makeId(),
    title: "New chat",
    createdAt: Date.now(),
    messages: [],
  };
  threads.set(t.id, t);
  emit();
  return t;
}

export function getOrCreateThread(id: string): AssistantThread {
  const existing = threads.get(id);
  if (existing) return existing;
  const t: AssistantThread = { id, title: "New chat", createdAt: Date.now(), messages: [] };
  threads.set(id, t);
  emit();
  return t;
}

export function listThreads(): AssistantThread[] {
  return [...threads.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export function updateThread(id: string, patch: Partial<AssistantThread>) {
  const t = threads.get(id);
  if (!t) return;
  threads.set(id, { ...t, ...patch });
  emit();
}

export function deleteThread(id: string) {
  threads.delete(id);
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useThreads() {
  return useSyncExternalStore(
    subscribe,
    () => listThreads(),
    () => [] as AssistantThread[],
  );
}
