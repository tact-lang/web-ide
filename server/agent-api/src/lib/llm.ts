export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface ToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LlmToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LlmResponse {
  content: string;
  toolCalls: LlmToolCall[];
  finishReason: string;
}

export async function callLlm(input: {
  messages: ChatMessage[];
  tools?: ToolSchema[];
  skill?: string;
}): Promise<LlmResponse> {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.TON_IDE_AI_API_KEY;
  const baseUrl =
    process.env.OPENAI_BASE_URL ??
    process.env.TON_IDE_AI_GATEWAY_URL ??
    'https://api.openai.com/v1';

  const systemParts: string[] = [];
  if (input.skill) systemParts.push(input.skill);
  systemParts.push(
    'You are a TON blockchain development assistant. Use tools to read files, compile, and test. Prefer small focused changes.',
  );

  const messages: ChatMessage[] = [
    { role: 'system', content: systemParts.join('\n\n') },
    ...input.messages.filter((m) => m.role !== 'system'),
  ];

  if (!apiKey) {
    return mockLlmResponse(input);
  }

  const body: Record<string, unknown> = {
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    messages: messages.map((m) => {
      if (m.role === 'tool') {
        return {
          role: 'tool',
          tool_call_id: m.tool_call_id,
          content: m.content,
        };
      }
      return {
        role: m.role,
        content: m.content,
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
        ...(m.name ? { name: m.name } : {}),
      };
    }),
  };

  if (input.tools?.length) {
    body.tools = input.tools;
    body.tool_choice = 'auto';
  }

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM error ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as {
    choices: {
      message: {
        content?: string;
        tool_calls?: {
          id: string;
          function: { name: string; arguments: string };
        }[];
      };
      finish_reason: string;
    }[];
  };

  const choice = data.choices[0];
  const toolCalls: LlmToolCall[] =
    choice.message.tool_calls?.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments || '{}') as Record<
        string,
        unknown
      >,
    })) ?? [];

  return {
    content: choice.message.content ?? '',
    toolCalls,
    finishReason: choice.finish_reason,
  };
}

function mockLlmResponse(input: {
  messages: ChatMessage[];
  tools?: ToolSchema[];
}): LlmResponse {
  const lastUser = [...input.messages]
    .reverse()
    .find((m) => m.role === 'user')?.content;

  const wantsCompile =
    lastUser?.toLowerCase().includes('compile') ||
    lastUser?.toLowerCase().includes('скомпил');
  const wantsTest =
    lastUser?.toLowerCase().includes('test') ||
    lastUser?.toLowerCase().includes('тест');
  const wantsRead =
    lastUser?.toLowerCase().includes('read') ||
    lastUser?.toLowerCase().includes('файл');

  if (wantsRead && input.tools?.some((t) => t.function.name === 'read_project_files')) {
    return {
      content: 'Listing project files.',
      toolCalls: [
        {
          id: 'mock-1',
          name: 'read_project_files',
          arguments: { listOnly: true },
        },
      ],
      finishReason: 'tool_calls',
    };
  }

  if (wantsCompile && input.tools?.some((t) => t.function.name === 'compile_contract')) {
    return {
      content: 'Compiling the contract entry file.',
      toolCalls: [
        {
          id: 'mock-2',
          name: 'compile_contract',
          arguments: { entryFile: 'main.tact', language: 'tact' },
        },
      ],
      finishReason: 'tool_calls',
    };
  }

  if (wantsTest && input.tools?.some((t) => t.function.name === 'run_sandbox_tests')) {
    return {
      content: 'Running sandbox tests.',
      toolCalls: [
        {
          id: 'mock-3',
          name: 'run_sandbox_tests',
          arguments: { specFile: 'tests/default.spec.ts' },
        },
      ],
      finishReason: 'tool_calls',
    };
  }

  return {
    content:
      'TON IDE Agent API is running in mock mode. Set OPENAI_API_KEY or TON_IDE_AI_API_KEY for full LLM responses. I can use tools: compile, test, read files, apply patches (with your approval).',
    toolCalls: [],
    finishReason: 'stop',
  };
}
