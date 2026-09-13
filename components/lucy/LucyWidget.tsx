"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics/events";
import type {
  PublicLucyHistoryTurn,
  PublicLucyReference,
  PublicLucyResponse,
} from "@/lib/lucy/contracts";
import { resolvePublicLucyPageContext } from "@/lib/lucy/page-context";
import type { PublicLucyContent } from "@/types/content";

type Message = {
  id: number;
  role: "lucy" | "visitor";
  text: string;
  clarification?: string;
  sources?: PublicLucyReference[];
  links?: PublicLucyReference[];
};

type LucyWidgetProps = Pick<PublicLucyContent, "intro" | "suggestions">;

const HISTORY_TTL_MS = 30 * 60 * 1_000;
const HISTORY_TURNS = 6;
const HISTORY_TURN_CHARACTERS = 1_000;
const currentTime = () => Date.now();

function historyFrom(messages: Message[]): PublicLucyHistoryTurn[] {
  return messages
    .filter((message) => message.id > 0)
    .slice(-HISTORY_TURNS)
    .map((message) => ({
      role: message.role,
      content: message.text.slice(0, HISTORY_TURN_CHARACTERS),
    }));
}

export function LucyWidget({ intro, suggestions }: LucyWidgetProps) {
  const pathname = usePathname();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const nextMessageId = useRef(1);
  const lastActivityAt = useRef(0);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: "lucy", text: intro },
  ]);

  function resetConversation() {
    setQuestion("");
    setMessages([{ id: 0, role: "lucy", text: intro }]);
    nextMessageId.current = 1;
    lastActivityAt.current = currentTime();
  }

  function expireConversationIfNeeded() {
    const observedAt = currentTime();
    if (lastActivityAt.current === 0) lastActivityAt.current = observedAt;
    else if (observedAt - lastActivityAt.current > HISTORY_TTL_MS) resetConversation();
  }

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        window.setTimeout(() => launcherRef.current?.focus(), 0);
      }
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function openWidget() {
    expireConversationIfNeeded();
    setOpen(true);
    track({ name: "lucy_open", properties: { entryPoint: "global_widget" } });
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function closeWidget() {
    setOpen(false);
    window.setTimeout(() => launcherRef.current?.focus(), 0);
  }

  async function ask(text: string) {
    const normalized = text.trim();
    if (sending || normalized.length < 2 || normalized.length > 500) return;
    expireConversationIfNeeded();
    const history = historyFrom(messages);
    lastActivityAt.current = currentTime();

    setQuestion("");
    setSending(true);
    setMessages((current) => [
      ...current,
      { id: nextMessageId.current++, role: "visitor", text: normalized },
    ]);
    track({ name: "lucy_question_submit", properties: { entryPoint: "global_widget" } });

    try {
      const response = await fetch("/api/lucy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: normalized,
          page_context: resolvePublicLucyPageContext(pathname),
          history,
        }),
      });
      const result = (await response.json()) as PublicLucyResponse;
      const answer =
        response.ok && result.ok
          ? result.answer
          : !result.ok
            ? result.message
            : "Lucy is taking a quiet moment. Please try again shortly.";
      setMessages((current) => [
        ...current,
        {
          id: nextMessageId.current++,
          role: "lucy",
          text: answer,
          ...(result.ok
            ? {
                clarification: result.clarification,
                sources: result.sources,
                links: result.links,
              }
            : {}),
        },
      ]);
      track({
        name:
          response.ok && result.ok
            ? result.outcome === "fallback"
              ? "lucy_fallback"
              : result.outcome === "partial"
                ? "lucy_partial_answer"
                : "lucy_answer_received"
            : "lucy_unavailable",
        properties: { entryPoint: "global_widget" },
      });
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: nextMessageId.current++,
          role: "lucy",
          text: "Lucy is taking a quiet moment. Please try again shortly.",
        },
      ]);
      track({ name: "lucy_unavailable", properties: { entryPoint: "global_widget" } });
    } finally {
      setSending(false);
    }
  }

  return (
    <aside className="lucy-widget" aria-label="Ask Lucy">
      {open ? (
        <section className="lucy-panel" role="dialog" aria-labelledby={titleId}>
          <header className="lucy-panel-header">
            <div>
              <p className="lucy-kicker">Utopia concierge</p>
              <h2 id={titleId}>Ask Lucy</h2>
            </div>
            <button
              className="lucy-close"
              type="button"
              aria-label="Close Lucy"
              onClick={closeWidget}
            >
              ×
            </button>
          </header>
          <div className="lucy-messages" aria-live="polite" aria-busy={sending}>
            {messages.map((message) => (
              <div className={`lucy-message lucy-message-${message.role}`} key={message.id}>
                <span>{message.role === "lucy" ? "Lucy" : "You"}</span>
                <p>{message.text}</p>
                {message.clarification && <p className="lucy-clarification">{message.clarification}</p>}
                {message.sources?.length ? (
                  <div className="lucy-references" aria-label="Sources">
                    <strong>Sources</strong>
                    {message.sources.map((source) => (
                      <a href={source.href} key={source.id}>{source.label}</a>
                    ))}
                  </div>
                ) : null}
                {message.links?.length ? (
                  <div className="lucy-references" aria-label="Useful links">
                    {message.links.map((link) => (
                      <a href={link.href} key={link.id}>{link.label} <span aria-hidden="true">→</span></a>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {sending && <p className="lucy-thinking">Lucy is looking through Utopia’s guide…</p>}
          </div>
          {messages.length === 1 && (
            <div className="lucy-suggestions" aria-label="Suggested questions">
              {suggestions.map((suggestion) => (
                <button type="button" key={suggestion} onClick={() => void ask(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          <form
            className="lucy-form"
            onSubmit={(event) => {
              event.preventDefault();
              void ask(question);
            }}
          >
            <label className="lucy-visually-hidden" htmlFor={`${titleId}-question`}>
              Ask Lucy a question
            </label>
            <input
              id={`${titleId}-question`}
              ref={inputRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength={500}
              placeholder="Ask about stays, owners, or design…"
              disabled={sending}
            />
            <button type="submit" disabled={sending || question.trim().length < 2}>
              Send <span aria-hidden="true">→</span>
            </button>
          </form>
          <div className="lucy-footer-note">
            <p className="lucy-privacy">Approved public information only. This chat isn’t saved and clears on refresh or after 30 minutes.</p>
            {messages.length > 1 && <button type="button" onClick={resetConversation}>Start over</button>}
          </div>
        </section>
      ) : (
        <button
          ref={launcherRef}
          className="lucy-launcher"
          type="button"
          aria-label="Ask Lucy"
          aria-haspopup="dialog"
          aria-expanded="false"
          onClick={openWidget}
        >
          <span className="lucy-mark" aria-hidden="true">L</span>
          <span><small>Utopia concierge</small>Ask Lucy</span>
        </button>
      )}
    </aside>
  );
}
