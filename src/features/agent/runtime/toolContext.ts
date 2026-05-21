import type { Tree } from '@/interfaces/workspace.interface';
import type { WebContainer } from '@webcontainer/api';
import type { Blockchain } from '@ton/sandbox';
import type {
  AgentProjectContext,
  CompileContext,
  ServiceLogger,
} from '@/services/types';
import type { AgentId } from '../types';

export interface ToolExecutionContext {
  agentId: AgentId;
  projectPath: string;
  language: 'func' | 'tact' | 'tolk';
  projectFiles: Tree[];
  agentContext: AgentProjectContext;
  log: ServiceLogger;
  webcontainer: WebContainer | null;
  sandbox: Blockchain | null;
  compileOptions: Omit<CompileContext, 'projectPath' | 'language' | 'projectFiles'>;
  compileFunc: (
    file: Pick<Tree, 'path'>,
    projectId: string,
  ) => Promise<Map<string, Buffer>>;
  compileTs: (
    filePath: string,
    projectId: string,
  ) => Promise<{ code: string }[]>;
  getFile: (path: string) => Promise<string | undefined>;
  onPendingPatch?: (
    patch: import('@/services/projectFs').PendingPatch,
  ) => Promise<boolean>;
  updateAgentContext?: (partial: Partial<AgentProjectContext>) => void;
}
