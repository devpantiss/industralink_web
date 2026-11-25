/**
 * Live chat updates from the backend (WebSocket at <api host>/ws).
 *
 * The connection only says "something changed"; each event refreshes the matching
 * data through React Query, and the backend stays the source of truth. If the
 * connection drops, it comes back by itself (1 s, 2 s, 5 s, 10 s, 30 s…) and then
 * reloads the chats, so nothing is missed. The pages also keep a slow refresh timer.
 */
import { useSyncExternalStore } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { qk } from "@/api/keys";
import { session } from "@/lib/session";

/** Waits before reconnecting: quick at first, then slower. */
const RETRY_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000];
/** Close codes from the backend that mean "don't try again" (logged out, blocked, admin). */
const NO_RETRY_CODES = [4001, 4003];
/** How long "typing…" stays without a new typing event. */
const TYPING_SHOWN_MS = 4_000;
/** Least time between two "I'm typing" signals we send for one chat. */
const TYPING_SEND_GAP_MS = 2_500;

type LiveEvent =
  | { type: "ready" }
  | { type: "message:new"; message: { applicationId: string } }
  | { type: "chat:read" | "chat:changed" | "chat:typing"; applicationId: string }
  | { type: "messaging:changed"; enabled: boolean };

/** ws://host/ws from the API address (http → ws, https → wss). */
function liveUrl(): string {
  const api = new URL(import.meta.env.VITE_API_URL ?? "/api/v1", window.location.href);
  api.protocol = api.protocol === "https:" ? "wss:" : "ws:";
  api.pathname = "/ws";
  api.search = "";
  return api.toString();
}

// A small store the pages watch with useSyncExternalStore.
let connected = false;
/** Chats where the other side is typing right now, each with a timer to clear it. */
const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Shows "typing…" for this chat, or hides it. */
function setTyping(applicationId: string, typing: boolean) {
  clearTimeout(typingTimers.get(applicationId));
  typingTimers.delete(applicationId);
  if (typing) typingTimers.set(applicationId, setTimeout(() => setTyping(applicationId, false), TYPING_SHOWN_MS));
  changed();
}

let socket: WebSocket | null = null;
const lastTypingSent = new Map<string, number>();

/** Closes the current connection; its close event is then ignored (no retry). */
function closeSocket() {
  const ws = socket;
  socket = null;
  connected = false;
  changed();
  ws?.close();
}

/**
 * Opens the live connection for the logged-in user. Returns a function that closes it
 * (call it on logout / unmount).
 */
export function startLiveChat(qc: QueryClient): () => void {
  let stopped = false;
  let attempt = 0;
  let everReady = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  const refreshChat = (applicationId: string) => {
    qc.invalidateQueries({ queryKey: qk.messages.all, exact: true });
    qc.invalidateQueries({ queryKey: qk.messages.thread(applicationId) });
  };

  const handle = (event: LiveEvent) => {
    switch (event.type) {
      case "ready":
        attempt = 0;
        connected = true;
        changed();
        // After a reconnect, load everything that may have arrived meanwhile.
        if (everReady) qc.invalidateQueries({ queryKey: qk.messages.all });
        everReady = true;
        return;
      case "message:new":
        setTyping(event.message.applicationId, false);
        return refreshChat(event.message.applicationId);
      case "chat:read":
      case "chat:changed":
        return refreshChat(event.applicationId);
      case "chat:typing":
        setTyping(event.applicationId, true);
        return;
      case "messaging:changed":
        qc.invalidateQueries({ queryKey: qk.messages.all });
    }
  };

  const connect = () => {
    const token = session.get();
    if (stopped || !token) return;
    const ws = new WebSocket(liveUrl());
    socket = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: "auth", token }));
    ws.onmessage = (message) => {
      try {
        handle(JSON.parse(String(message.data)) as LiveEvent);
      } catch {
        // Ignore broken events.
      }
    };
    ws.onclose = (close) => {
      if (socket !== ws) return; // An older connection that was already replaced.
      socket = null;
      connected = false;
      changed();
      if (stopped || NO_RETRY_CODES.includes(close.code)) return;
      const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
      attempt++;
      retryTimer = setTimeout(connect, delay);
    };
  };

  // Reconnect at once when the computer wakes up or the network comes back.
  const onOnline = () => {
    if (socket || stopped) return;
    clearTimeout(retryTimer);
    attempt = 0;
    connect();
  };
  window.addEventListener("online", onOnline);

  connect();
  return () => {
    stopped = true;
    clearTimeout(retryTimer);
    window.removeEventListener("online", onOnline);
    closeSocket();
    for (const timer of typingTimers.values()) clearTimeout(timer);
    typingTimers.clear();
    changed();
  };
}

/** Tell the other side "typing…" (sent at most every 2.5 s per chat). */
export function sendTyping(applicationId: string) {
  const now = Date.now();
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  if (now - (lastTypingSent.get(applicationId) ?? 0) < TYPING_SEND_GAP_MS) return;
  lastTypingSent.set(applicationId, now);
  socket.send(JSON.stringify({ type: "typing", applicationId }));
}

/** True while the live connection is up (pages can then refresh less often). */
export function useLiveConnected(): boolean {
  return useSyncExternalStore(subscribe, () => connected);
}

const subscribeVisibility = (listener: () => void) => {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
};

/**
 * True while this browser tab is on screen. An open chat only loads (and so only counts
 * as "seen") while it is, like WhatsApp: a chat left open in a hidden tab keeps its badge.
 */
export function usePageVisible(): boolean {
  return useSyncExternalStore(subscribeVisibility, () => document.visibilityState === "visible");
}

/** True while the other side of this chat is typing. */
export function useIsTyping(applicationId: string): boolean {
  return useSyncExternalStore(subscribe, () => typingTimers.has(applicationId));
}
