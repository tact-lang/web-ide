import type { ContractLanguage, Project, Tree } from '@/interfaces/workspace.interface';
import type { WebContainer } from '@webcontainer/api';
import type { Blockchain } from '@ton/sandbox';

export type ServiceLogLevel = 'info' | 'error' | 'success';

export type ServiceLogger = (message: string, level?: ServiceLogLevel) => void;

export interface ProjectFsContext {
  projectPath: string;
  log?: ServiceLogger;
}

export interface CompileContext extends ProjectFsContext {
  language: ContractLanguage;
  projectFiles: Tree[];
  isExternalMessage?: boolean;
  isContractDebugEnabled?: boolean;
}

export interface CompileResultPayload {
  success: boolean;
  artifacts: string[];
  errors: string[];
  contractBOC?: string;
}

export interface TestRunnerContext extends ProjectFsContext {
  webcontainer: WebContainer;
  specFile: string;
  compileFunc: (
    file: Pick<Tree, 'path'>,
    projectId: string,
  ) => Promise<Map<string, Buffer>>;
  compileTs: (
    filePath: string,
    projectId: string,
  ) => Promise<{ code: string }[]>;
  getFile: (path: string) => Promise<string | undefined>;
}

export interface TestRunResult {
  success: boolean;
  exitCode: number;
  stdout: string;
}

export interface DeploySandboxContext extends ProjectFsContext {
  blockchain: Blockchain;
  language: ContractLanguage;
  abiPath: string;
  tonValue?: string;
  initParams?: Record<string, unknown>;
}

export interface DeployResult {
  success: boolean;
  address?: string;
  logs: string[];
  errors: string[];
}

export interface MistiContext extends ProjectFsContext {
  projectFiles: Tree[];
  selectedPath: string;
  minSeverity?: number;
}

export interface AgentProjectContext {
  project: Pick<Project, 'path' | 'language' | 'template' | 'name'> | null;
  openFiles: string[];
  fileTree: string[];
  lastCompile?: CompileResultPayload;
  lastTestRun?: TestRunResult;
  sharedContext?: Record<string, unknown>;
}
