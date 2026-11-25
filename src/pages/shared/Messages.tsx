import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { ArrowLeft, Check, CheckCheck, Lock, Send } from "lucide-react";
import type { Message, MessagePage, MessageThread } from "@/types";
import { messagesApi } from "@/api/extra";
import { qk } from "@/api/keys";
import { errorMessage } from "@/api/client";
import { sendTyping, useIsTyping, useLiveConnected, usePageVisible } from "@/api/live";
import { useUser } from "@/app/AuthContext";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { formatDateTime, timeAgo } from "@/lib/format";
import { Avatar, PageHeader } from "@/components/ui/Misc";
import { StageBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";

/**
 * Worker ↔ HR chat, one conversation per application. Opens once the worker
 * is shortlisted (same rule as calling), so HR isn't flooded and workers
 * don't get spam. New messages, "typing…" and seen ticks come live (src/api/live.ts);
 * the refresh timers are only a fallback, slower while the live connection is up.
 */
export default function Messages() {
  const user = useUser();
  const [sp, setSp] = useSearchParams();
  const openId = sp.get("c") ?? undefined;
  const live = useLiveConnected();
  const threads = useQuery({ queryKey: qk.messages.all, queryFn: messagesApi.threads, refetchInterval: live ? 60_000 : 15_000 });
  const worker = user.role === "worker";
  const select = (id?: string) => setSp(id ? { c: id } : {}, { replace: !id });

  return (
    <div>
      <PageHeader title={t("Messages")} description={worker ? t("Chat with HR after you're shortlisted.") : "Chat with shortlisted candidates. Phone numbers stay private."} />
      {threads.isLoading ? <ListSkeleton count={3} /> : threads.isError ? <ErrorState onRetry={() => threads.refetch()} /> : threads.data!.length === 0 ? (
        <EmptyState art="messages" title={t("No conversations yet")}
          description={worker ? t("When a company shortlists you, you can message their HR here.") : "Shortlist a candidate, then message them from their profile."} />
      ) : (
        <div className="grid h-[calc(100vh-15rem)] min-h-[420px] overflow-hidden rounded-lg border border-border bg-surface shadow-xs md:grid-cols-[320px_1fr]">
          <ThreadList threads={threads.data!} openId={openId} onSelect={select} className={cn(openId && "hidden md:block")} />
          {openId ? <Thread key={openId} applicationId={openId} onBack={() => select()} /> : (
            <div className="hidden items-center justify-center p-8 text-center text-body text-ink-muted md:flex">{t("Choose a conversation")}</div>
          )}
        </div>
      )}
    </div>
  );
}

function ThreadList({ threads, openId, onSelect, className }: { threads: MessageThread[]; openId?: string; onSelect: (id: string) => void; className?: string }) {
  return (
    <ul className={cn("overflow-y-auto border-r border-border", className)} aria-label={t("Conversations")}>
      {threads.map((th) => (
        <li key={th.applicationId}>
          <button onClick={() => onSelect(th.applicationId)} aria-current={openId === th.applicationId}
            className={cn("flex w-full gap-3 border-b border-border px-4 py-3 text-left transition-colors", openId === th.applicationId ? "bg-primary-soft" : "hover:bg-surface-muted")}>
            <Avatar name={th.otherName} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className={cn("truncate text-body text-ink", th.unread ? "font-semibold" : "font-medium")}>{th.otherName}</span>
                {th.lastAt && <span className="shrink-0 text-caption text-ink-muted">{timeAgo(th.lastAt)}</span>}
              </span>
              <span className="block truncate text-caption text-ink-muted">{th.jobTitle}</span>
              <span className="mt-0.5 flex items-center gap-2">
                <span className={cn("min-w-0 flex-1 truncate text-small", th.unread ? "text-ink" : "text-ink-secondary")}>{th.lastMessage ?? t("No messages yet")}</span>
                {th.unread > 0 && <span className="shrink-0 rounded-full bg-primary px-1.5 text-caption font-bold text-white">{th.unread}</span>}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

const QUICK = {
  worker: ["What time should I come?", "Which documents should I bring?", "Is food and stay provided?"],
  employer: ["Please bring your ITI certificate and one ID proof.", "Can you join from Monday?", "Please call me between 10 AM and 5 PM."],
};

/** A message being sent. The clientId is made once, so retries are saved only once. */
interface Draft { body: string; clientId: string }

/** A unique id for a message. randomUUID needs https (or localhost), so there is a fallback. */
function newClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Joins two lists of messages: no copies (the newer copy wins), oldest first. */
function mergeMessages(older: Message[], newer: Message[]): Message[] {
  const byId = new Map(older.map((m) => [m.id, m]));
  for (const m of newer) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
}

function Thread({ applicationId, onBack }: { applicationId: string; onBack: () => void }) {
  const user = useUser();
  const live = useLiveConnected();
  const typing = useIsTyping(applicationId);
  // Loading the chat marks it read, so it only loads while the tab is on screen. A new
  // message in a hidden tab waits (and keeps its badge) until you come back to it.
  const visible = usePageVisible();
  const q = useQuery({ queryKey: qk.messages.thread(applicationId), queryFn: () => messagesApi.thread(applicationId), enabled: visible, refetchInterval: live ? 60_000 : 10_000 });
  // Older messages loaded with "Load earlier messages" (the query above keeps the newest 50).
  const [older, setOlder] = useState<{ messages: Message[]; hasMore: boolean } | null>(null);
  const loadOlder = useMutation({
    mutationFn: (before: string) => messagesApi.thread(applicationId, before),
    // Keep everything shown so far too, so nothing falls out as new messages arrive.
    onSuccess: (page: MessagePage) => setOlder((prev) => ({ messages: mergeMessages(page.messages, mergeMessages(prev?.messages ?? [], q.data?.messages ?? [])), hasMore: page.hasMore })),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const [text, setText] = useState("");
  const qc = useQueryClient();
  const toast = useToast();
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const send = useMutation({
    mutationFn: ({ body, clientId }: Draft) => messagesApi.send(applicationId, body, clientId),
    // Retry only when the network failed. The same clientId makes sure it is saved once.
    retry: (count, error) => count < 2 && isAxiosError(error) && !error.response,
    onMutate: async ({ body }) => {
      // Show the message straight away; the server copy replaces it.
      const key = qk.messages.thread(applicationId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<{ thread: MessageThread; messages: Message[] }>(key);
      if (prev) qc.setQueryData(key, { ...prev, messages: [...prev.messages, { id: "tmp", applicationId, fromUserId: user.id, fromRole: user.role as "worker", text: body, at: new Date().toISOString() }] });
      setText("");
      return { prev };
    },
    onError: (e, { body }, ctx) => { if (ctx?.prev) qc.setQueryData(qk.messages.thread(applicationId), ctx.prev); setText(body); toast.error(errorMessage(e)); },
    onSettled: () => { qc.invalidateQueries({ queryKey: qk.messages.all, exact: true }); qc.invalidateQueries({ queryKey: qk.messages.thread(applicationId) }); },
  });
  const messages = useMemo(() => mergeMessages(older?.messages ?? [], q.data?.messages ?? []), [older, q.data]);
  const hasMore = older ? older.hasMore : (q.data?.hasMore ?? false);
  const lastId = messages.at(-1)?.id;
  const lastIsMine = messages.at(-1)?.fromUserId === user.id;
  const scrollToEnd = () => { if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight; };
  // Go to the bottom for your own new message, or for any new one / the typing bubble
  // when you were already there. Reading older messages is never interrupted.
  useEffect(() => { if (lastId && (lastIsMine || atBottom.current)) scrollToEnd(); }, [lastId, lastIsMine]);
  useEffect(() => { if (typing && atBottom.current) scrollToEnd(); }, [typing]);
  // Opening a chat marks it read, so refresh the inbox list. Only the list (exact): the
  // chat's own key starts with "messages" too, and refreshing it here would loop forever.
  useEffect(() => { qc.invalidateQueries({ queryKey: qk.messages.all, exact: true }); }, [q.dataUpdatedAt, qc]);

  const submit = (e: FormEvent) => { e.preventDefault(); const body = text.trim(); if (body) send.mutate({ body, clientId: newClientId() }); };

  if (q.isError) return <div className="p-5"><ErrorState onRetry={() => q.refetch()} /></div>;
  if (!q.data) return <div className="p-5"><ListSkeleton count={2} /></div>;
  const { thread } = q.data;
  const mine = (m: Message) => m.fromUserId === user.id;
  const appLink = user.role === "worker" ? `/worker/applications/${applicationId}` : undefined;

  return (
    <section className="flex min-h-0 flex-col" aria-label={`Conversation with ${thread.otherName}`}>
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={onBack} className="-ml-1 rounded-md p-1 text-ink-secondary hover:bg-surface-muted md:hidden" aria-label={t("Back")}><ArrowLeft className="h-5 w-5" /></button>
        <Avatar name={thread.otherName} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-ink">{thread.otherName}</p>
          {typing ? (
            <p className="flex h-6 items-center text-caption font-medium text-primary" aria-live="polite">{t("typing…")}</p>
          ) : (
            <p className="flex h-6 items-center gap-2 truncate text-caption text-ink-muted">{thread.jobTitle} <StageBadge stage={thread.stage} audience={user.role === "worker" ? "worker" : "employer"} /></p>
          )}
        </div>
        {appLink && <Link to={appLink} className="hidden text-small font-medium text-primary hover:underline sm:inline">{t("View application")}</Link>}
      </header>

      <div ref={scroller} onScroll={(e) => { const el = e.currentTarget; atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
        className="flex-1 space-y-2 overflow-y-auto bg-surface-muted/50 px-4 py-4">
        {hasMore && (
          <div className="flex justify-center">
            <Button variant="ghost" loading={loadOlder.isPending} onClick={() => loadOlder.mutate(messages[0].id)}>{t("Load earlier messages")}</Button>
          </div>
        )}
        {messages.length === 0 && <p className="py-8 text-center text-small text-ink-muted">{t("Say hello. Keep it about this job.")}</p>}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", mine(m) ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[80%] rounded-2xl px-3.5 py-2 text-body shadow-xs", mine(m) ? "rounded-br-sm bg-primary text-white" : "rounded-bl-sm bg-surface text-ink")}>
              <p className="whitespace-pre-line break-words">{m.text}</p>
              <p className={cn("mt-0.5 flex items-center justify-end gap-1 text-[11px]", mine(m) ? "text-white/70" : "text-ink-muted")}>
                {m.id === "tmp" ? t("Sending…") : formatDateTime(m.at)}
                {m.id !== "tmp" && m.seen !== undefined && (m.seen
                  ? <CheckCheck className="h-3.5 w-3.5 text-white" aria-label={t("Seen")} />
                  : <Check className="h-3.5 w-3.5" aria-label={t("Sent")} />)}
              </p>
            </div>
          </div>
        ))}
        {typing && <TypingBubble />}
      </div>

      {thread.canSend ? (
        <div className="border-t border-border p-3">
          {messages.length < 2 && (
            <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
              {QUICK[user.role === "worker" ? "worker" : "employer"].map((s) => (
                <button key={s} onClick={() => setText(t(s))} className="shrink-0 rounded-full border border-border bg-surface px-3 py-1 text-small text-ink-secondary hover:border-primary hover:text-primary">{t(s)}</button>
              ))}
            </div>
          )}
          <form onSubmit={submit} className="flex items-end gap-2">
            <label className="sr-only" htmlFor="msg">{t("Write a message")}</label>
            <textarea id="msg" rows={1} value={text} onChange={(e) => { setText(e.target.value); if (e.target.value.trim()) sendTyping(applicationId); }} maxLength={1000} placeholder={t("Write a message…")}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e); } }}
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-body text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none" />
            <Button type="submit" disabled={!text.trim()} aria-label={t("Send")} className="h-11 w-11 px-0"><Send className="h-4 w-4" /></Button>
          </form>
          <p className="mt-1.5 text-caption text-ink-muted">{t("Never share OTPs or bank details. IndustriaLink never asks for money.")}</p>
        </div>
      ) : (
        <p className="flex items-center justify-center gap-2 border-t border-border px-4 py-3 text-small text-ink-muted"><Lock className="h-4 w-4" aria-hidden />{t("This conversation is closed.")}</p>
      )}
    </section>
  );
}

/** The other side is typing: three bouncing dots in a bubble, like WhatsApp. */
function TypingBubble() {
  return (
    <div className="flex justify-start" aria-hidden>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-surface px-3.5 py-3 shadow-xs">
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-muted" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-muted" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-muted" />
      </div>
    </div>
  );
}
