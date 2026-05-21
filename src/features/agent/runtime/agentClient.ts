import { AppConfig } from '@/config/AppConfig';
import type { ChatMessage } from './types';

export function getAgentApiBase(): string {
  return AppConfig.agentApiUrl.replace(/\/$/, '');
}

export interface AgentChatRequest {
  messages: ChatMessage[];
  tools?: {
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }[];
  skill?: string;
  context?: Record<string, unknown>;
}

export interface AgentChatResponse {
  message: {
    role: 'assistant';
    content: string;
    toolCalls: { id: string; name: string; arguments: Record<string, unknown> }[];
  };
  finishReason: string;
}

export async function postAgentChat(
  req: AgentChatRequest,
  signal?: AbortSignal,
): Promise<AgentChatResponse> {
  const res = await fetch(`${getAgentApiBase()}/v1/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Agent API ${res.status}: ${text}`);
  }
  return res.json() as Promise<AgentChatResponse>;
}

export async function* streamAgentChat(
  req: AgentChatRequest,
  signal?: AbortSignal,
): AsyncGenerator<
  | { type: 'text-delta'; delta: string }
  | { type: 'tool-call'; id: string; name: string; arguments: Record<string, unknown> }
  | { type: 'finish'; finishReason: string }
  | { type: 'error'; message: string }
> {
  const res = await fetch(`${getAgentApiBase()}/v1/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`Agent stream failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      const lines = part.split('\n');
      let event = 'message';
      let data = '';
      for (const line of lines) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (!data) continue;
      try {
        const parsed = JSON.parse(data) as Record<string, unknown>;
        if (event === 'text-delta') {
          yield { type: 'text-delta', delta: String(parsed.delta ?? '') };
        } else if (event === 'tool-call') {
          yield {
            type: 'tool-call',
            id: String(parsed.id),
            name: String(parsed.name),
            arguments: (parsed.arguments ?? {}) as Record<string, unknown>,
          };
        } else if (event === 'finish') {
          yield {
            type: 'finish',
            finishReason: String(parsed.finishReason ?? 'stop'),
          };
        } else if (event === 'error') {
          yield { type: 'error', message: String(parsed.message ?? 'error') };
        }
      } catch {
        /* skip malformed */
      }
    }
  }
}

export async function createCloudJob(prompt: string, projectName?: string) {
  const res = await fetch(`${getAgentApiBase()}/v1/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, projectName }),
  });
  return res.json() as Promise<{ jobId: string; status: string }>;
}

export async function getCloudJob(jobId: string) {
  const res = await fetch(`${getAgentApiBase()}/v1/jobs/${jobId}`);
  return res.json();
}
