"use client";

import { useEffect, useId, useRef, useState } from "react";
import { track } from "@/lib/analytics/events";
import type { PublicLucyResponse } from "@/lib/lucy/contracts";
import type { PublicLucyContent } from "@/types/content";

type Message = { id: number; role: "lucy" | "visitor"; text: string };

type LucyWidgetProps = Pick<PublicLucyContent, "intro" | "suggestions">;

export function LucyWidget({ intro, suggestions }: LucyWidgetProps) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const nextMessageId = useRef(1);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: "lucy", text: intro },
  ]);

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
        body: JSON.stringify({ question: normalized }),
      });
      const result = (await response.json()) as PublicLucyResponse;
      const message =
        response.ok && result.ok
          ? result.answer
          : !result.ok
            ? result.message
            : "Lucy is taking a quiet moment. Please try again shortly.";
      setMessages((current) => [
        ...current,
        { id: nextMessageId.current++, role: "lucy", text: message },
      ]);
      track({
        name: response.ok ? "lucy_answer_received" : "lucy_unavailable",
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
              <p className={`lucy-message lucy-message-${message.role}`} key={message.id}>
                <span>{message.role === "lucy" ? "Lucy" : "You"}</span>
                {message.text}
              </p>
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
          <p className="lucy-privacy">Approved public information only. This chat isn’t saved.</p>
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
