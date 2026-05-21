export type ChatMessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface AgentUiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: { id: string; name: string; status: 'pending' | 'done' | 'error'; result?: string }[];
  createdAt: number;
}
