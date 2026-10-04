export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FALLBACK_MESSAGE =
  'The portfolio assistant is online. Ask about projects, stack, services, or availability and I will respond with the latest context available.';

type ChatRole = 'user' | 'assistant' | 'system';

type ChatMessage = {
  role: ChatRole;
  content: string;
};

function normalizeMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
    .map((entry) => ({
      role: typeof entry.role === 'string' && ['user', 'assistant', 'system'].includes(entry.role) ? (entry.role as ChatRole) : 'user',
      content: typeof entry.content === 'string' ? entry.content : '',
    }))
    .filter((message) => message.content.trim().length > 0);
}

async function streamOpenAIResponse(messages: ChatMessage[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'Missing OPENAI_API_KEY. Add it to your environment to enable the chatbot.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      },
    );
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content:
            'You are the portfolio assistant for AladdinCode. Answer briefly, professionally, and use the context of a software engineer portfolio website. Focus on projects, engineering experience, expertise, and services.',
        },
        ...messages,
      ],
    }),
  });

  if (!response.ok || !response.body) {
    const details = await response.text();
    return new Response(
      JSON.stringify({
        error: details || 'The OpenAI request failed.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader!.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            const cleaned = part.trim();

            if (!cleaned.startsWith('data:')) {
              continue;
            }

            const payload = cleaned.replace(/^data:\s*/, '').trim();

            if (payload === '[DONE]') {
              controller.close();
              return;
            }

            try {
              const parsed = JSON.parse(payload);
              const piece = parsed.choices?.[0]?.delta?.content;

              if (piece) {
                controller.enqueue(new TextEncoder().encode(piece));
              }
            } catch {
              // Ignore malformed SSE fragments and continue streaming valid chunks.
            }
          }
        }

        if (buffer.trim()) {
          const payload = buffer.trim().replace(/^data:\s*/, '');

          if (payload && payload !== '[DONE]') {
            try {
              const parsed = JSON.parse(payload);
              const finalText = parsed.choices?.[0]?.delta?.content;

              if (finalText) {
                controller.enqueue(new TextEncoder().encode(finalText));
              }
            } catch {
              // Ignore final malformed buffer.
            }
          }
        }
      } catch (error) {
        controller.error(error);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const messages = normalizeMessages(payload.messages);

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No chat messages were supplied.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        },
      );
    }

    const useFallback = process.env.NODE_ENV === 'development' && !process.env.OPENAI_API_KEY;

    if (useFallback) {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(`The portfolio assistant is ready. ${messages.at(-1)?.content ?? FALLBACK_MESSAGE}`));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
        },
      });
    }

    return streamOpenAIResponse(messages);
  } catch (error) {
    console.error('Chat route error:', error);
    return new Response(
      JSON.stringify({
        error: 'The chatbot failed to generate a response.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      },
    );
  }
}

export async function GET() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
