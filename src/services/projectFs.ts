import type { Tree } from '@/interfaces/workspace.interface';
import fileSystem from '@/lib/fs';
import type { ProjectFsContext, ServiceLogger } from './types';

export async function listProjectFiles(
  projectPath: string,
  options?: { content?: boolean; extensions?: string[] },
): Promise<{ path: string; content?: string }[]> {
  const results: { path: string; content?: string }[] = [];

  async function walk(dir: string) {
    let entries: string[] = [];
    try {
      entries = await fileSystem.readdir(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const fullPath = `${dir}/${name}`;
      const stat = await fileSystem.stat(fullPath);
      if (stat.isDirectory()) {
        if (name === 'node_modules' || name === '.git') continue;
        await walk(fullPath);
      } else {
        if (fullPath.includes('/dist/')) continue;
        if (options?.extensions?.length) {
          const ext = name.split('.').pop();
          if (!ext || !options.extensions.some((e) => name.endsWith(e))) {
            continue;
          }
        }
        const item: { path: string; content?: string } = {
          path: fullPath.replace(`${projectPath}/`, '').replace(/^\//, ''),
        };
        if (options?.content) {
          try {
            item.content = (await fileSystem.readFile(fullPath)) as string;
          } catch {
            /* skip */
          }
        }
        results.push(item);
      }
    }
  }

  await walk(projectPath);
  return results;
}

export async function readProjectFiles(
  ctx: ProjectFsContext,
  paths: string[],
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const rel of paths) {
    const full = rel.startsWith(ctx.projectPath)
      ? rel
      : `${ctx.projectPath}/${rel}`;
    try {
      out[rel] = (await fileSystem.readFile(full)) as string;
    } catch (e) {
      ctx.log?.(`Failed to read ${rel}: ${(e as Error).message}`, 'error');
    }
  }
  return out;
}

export async function writeProjectFile(
  ctx: ProjectFsContext,
  relativePath: string,
  content: string,
): Promise<void> {
  const full = `${ctx.projectPath}/${relativePath.replace(/^\//, '')}`;
  await fileSystem.writeFile(full, content, { overwrite: true });
  ctx.log?.(`Wrote ${relativePath}`, 'success');
}

export async function writeProjectFiles(
  projectPath: string,
  files: Pick<Tree, 'type' | 'path' | 'content'>[],
  options?: { overwrite?: boolean },
): Promise<void> {
  const { default: EventEmitter } = await import('@/utility/eventEmitter');
  await Promise.all(
    files.map(async (file) => {
      if (file.type === 'directory') {
        return fileSystem.mkdir(file.path);
      }
      await fileSystem.writeFile(file.path, file.content ?? '', {
        overwrite: options?.overwrite ?? true,
      });
      EventEmitter.emit('FORCE_UPDATE_FILE', file.path);
    }),
  );
  EventEmitter.emit('RELOAD_PROJECT_FILES', projectPath);
}

export interface PendingPatch {
  path: string;
  relativePath: string;
  previousContent: string;
  newContent: string;
}

export async function preparePatch(
  ctx: ProjectFsContext,
  relativePath: string,
  newContent: string,
): Promise<PendingPatch> {
  const rel = relativePath.replace(/^\//, '');
  const full = `${ctx.projectPath}/${rel}`;
  let previousContent = '';
  try {
    previousContent = (await fileSystem.readFile(full)) as string;
  } catch {
    previousContent = '';
  }
  return {
    path: full,
    relativePath: rel,
    previousContent,
    newContent,
  };
}

export async function applyPatch(
  ctx: ProjectFsContext,
  patch: PendingPatch,
): Promise<void> {
  await writeProjectFile(ctx, patch.relativePath, patch.newContent);
}

export function defaultLogger: ServiceLogger = () => {};
