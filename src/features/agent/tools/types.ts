import type { z } from 'zod';
import type { AgentId } from '../types';
import type { ToolExecutionContext } from '../runtime/toolContext';

export interface ToolDefinition<T extends z.ZodType = z.ZodType> {
  id: string;
  description: string;
  parameters: T;
  execute: (
    ctx: ToolExecutionContext,
    args: z.infer<T>,
  ) => Promise<Record<string, unknown>>;
}

export interface ToolCallRequest {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolCallResult {
  toolCallId: string;
  name: string;
  result: Record<string, unknown>;
  error?: string;
}

export interface AgentToolRunOptions {
  agentId: AgentId;
  allowedTools: string[];
  onPendingPatch?: (
    patch: import('@/services/projectFs').PendingPatch,
  ) => Promise<boolean>;
}
