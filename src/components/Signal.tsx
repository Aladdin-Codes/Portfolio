'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useSignal } from '@/lib/signal-context';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const starterMessages: Message[] = [
  {
    role: 'assistant',
    content:
      'Hi — I can help answer questions about the portfolio, projects, engineering expertise, and technology decisions.',
  },
];

export default function Signal() {
  const { isOpen, openSignal, closeSignal } = useSignal();
  const [messages, setMessages] = useState<Message[]>(starterMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesLabel = useMemo(() => messages.map((message) => `${message.role}: ${message.content}`).join('\n'), [messages]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();

    if (!trimmed || isLoading) {
      return;
    }

    const nextUserMessage: Message = { role: 'user', content: trimmed };
    const nextMessages = [...messages, nextUserMessage];
    setMessages(nextMessages);
    setInput('');
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: nextMessages,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Unable to reach the chatbot.' }));
        throw new Error(payload.error || 'Unable to reach the chatbot.');
      }

      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error('Streaming response is not available.');
      }

      const decoder = new TextDecoder();
      let assistantReply = '';
      const assistantMessage: Message = { role: 'assistant', content: '' };

      setMessages((current) => [...current, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        assistantReply += chunk;

        setMessages((current) => {
          const updated = [...current];
          const last = updated[updated.length - 1];

          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: assistantReply };
          }

          return updated;
        });
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Something went wrong while connecting to the assistant.');
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: 'The assistant is unavailable right now. Try again in a moment or configure the API key.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed',
        right: '1rem',
        bottom: '1rem',
        zIndex: 120,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '0.75rem',
      }}
    >
      {isOpen ? (
        <section
          aria-label="Portfolio assistant"
          style={{
            width: 'min(360px, calc(100vw - 1.5rem))',
            background: '#0b0f14',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '1rem',
            boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.9rem 1rem',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8ee6d2' }}>
                Signal
              </div>
              <strong style={{ display: 'block', color: 'white', fontSize: '1rem' }}>Portfolio assistant</strong>
            </div>
            <button
              type="button"
              aria-label="Close assistant"
              onClick={closeSignal}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#f2f5f7',
                fontSize: '1.5rem',
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          <div
            aria-label="Assistant messages"
            style={{
              maxHeight: '380px',
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              color: '#f2f5f7',
            }}
          >
            <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.94rem' }}>{messagesLabel}</div>
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                style={{
                  alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                  background: message.role === 'user' ? '#275fc2' : 'rgba(255,255,255,0.06)',
                  color: '#f2f5f7',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '0.85rem',
                  padding: '0.7rem 0.8rem',
                  maxWidth: '80%',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {message.content}
              </div>
            ))}
            {isLoading && (
              <div style={{ fontSize: '0.8rem', color: '#a5b0ba', fontStyle: 'italic' }}>Thinking…</div>
            )}
            {error && (
              <div role="alert" style={{ color: '#ffb4b4', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <label htmlFor="signal-input" style={{ display: 'none' }}>
              Ask the assistant a question
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                id="signal-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about projects or services..."
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(255,255,255,0.02)',
                  color: '#f2f5f7',
                  padding: '0.75rem 0.85rem',
                  fontSize: '0.95rem',
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                style={{
                  cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                  borderRadius: '0.75rem',
                  border: 'none',
                  background: '#78a9ff',
                  color: '#0b0f14',
                  padding: '0.75rem 1rem',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                Send
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        aria-label={isOpen ? 'Close assistant' : 'Open assistant'}
        onClick={() => (isOpen ? closeSignal() : openSignal())}
        style={{
          width: '3.7rem',
          height: '3.7rem',
          border: 'none',
          borderRadius: '999px',
          background: 'linear-gradient(135deg, #78a9ff, #8ee6d2)',
          color: '#0b0f14',
          cursor: 'pointer',
          boxShadow: '0 18px 42px rgba(120,169,255,0.35)',
          fontWeight: 700,
          fontSize: '1.1rem',
        }}
      >
        AI
      </button>
    </div>
  );
}
