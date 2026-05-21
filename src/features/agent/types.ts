export type AgentId =
  | 'contract-developer'
  | 'jetton-engineer'
  | 'defi-architect'
  | 'frontend-integrator'
  | 'security-auditor';

export type AgentMessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface AgentMessage {
  id: string;
  role: AgentMessageRole;
  content: string;
  createdAt: number;
  agentId?: AgentId;
}

export type McpServerStatus = 'available' | 'planned' | 'needs_auth';

export interface McpServerDefinition {
  id: string;
  name: string;
  description: string;
  status: McpServerStatus;
}

export interface AgentDefinition {
  id: AgentId;
  name: string;
  description: string;
  skillPath: string;
  tools: string[];
}

export interface AgentRuntimeConfig {
  isEnabled: boolean;
  gatewayUrl?: string;
}
