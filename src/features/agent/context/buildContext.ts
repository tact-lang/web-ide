import { listProjectFiles } from '@/services/projectFs';
import type { AgentProjectContext } from '@/services/types';
import type { Project } from '@/interfaces/workspace.interface';

export async function buildAgentContext(input: {
  project: Project | null;
  openFiles: string[];
  lastCompile?: AgentProjectContext['lastCompile'];
  lastTestRun?: AgentProjectContext['lastTestRun'];
}): Promise<AgentProjectContext> {
  const projectPath = input.project?.path;
  let fileTree: string[] = [];
  if (projectPath) {
    const files = await listProjectFiles(projectPath);
    fileTree = files.map((f) => f.path);
  }

  let sharedContext: Record<string, unknown> | undefined;
  if (projectPath) {
    try {
      const { default: fileSystem } = await import('@/lib/fs');
      const raw = await fileSystem.readFile(
        `${projectPath}/.ide/shared-context.json`,
      );
      sharedContext = JSON.parse(raw as string);
    } catch {
      /* optional */
    }
  }

  return {
    project: input.project
      ? {
          path: input.project.path,
          language: input.project.language,
          template: input.project.template,
          name: input.project.name,
        }
      : null,
    openFiles: input.openFiles,
    fileTree,
    lastCompile: input.lastCompile,
    lastTestRun: input.lastTestRun,
    sharedContext,
  };
}
