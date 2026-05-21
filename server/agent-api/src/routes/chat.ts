import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { callLlm, type ChatMessage, type ToolSchema } from '../lib/llm.js';

export const chatRoutes = new Hono();

chatRoutes.post('/chat', async (c) => {
  const body = await c.req.json<{
    messages: ChatMessage[];
    tools?: ToolSchema[];
    skill?: string;
    context?: Record<string, unknown>;
  }>();

  const contextNote = body.context
    ? `\n\nProject context:\n${JSON.stringify(body.context, null, 2).slice(0, 8000)}`
    : '';

  const messages = body.messages.map((m) =>
    m.role === 'system'
      ? { ...m, content: m.content + contextNote }
      : m,
  );

  const response = await callLlm({
    messages,
    tools: body.tools,
    skill: body.skill,
  });

  return c.json({
    message: {
      role: 'assistant',
      content: response.content,
      toolCalls: response.toolCalls,
    },
    finishReason: response.finishReason,
  });
});

chatRoutes.post('/chat/stream', async (c) => {
  const body = await c.req.json<{
    messages: ChatMessage[];
    tools?: ToolSchema[];
    skill?: string;
    context?: Record<string, unknown>;
  }>();

  return streamSSE(c, async (stream) => {
    try {
      const response = await callLlm({
        messages: body.messages,
        tools: body.tools,
        skill: body.skill,
      });

      if (response.content) {
        await stream.writeSSE({
          event: 'text-delta',
          data: JSON.stringify({ delta: response.content }),
        });
      }

      for (const tc of response.toolCalls) {
        await stream.writeSSE({
          event: 'tool-call',
          data: JSON.stringify(tc),
        });
      }

      await stream.writeSSE({
        event: 'finish',
        data: JSON.stringify({ finishReason: response.finishReason }),
      });
    } catch (error) {
      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({ message: (error as Error).message }),
      });
    }
  });
});
