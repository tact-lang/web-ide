import fileSystem from '@/lib/fs';

export interface SharedChainContext {
  network?: string;
  contracts?: { name: string; address: string }[];
  notes?: string;
}

export async function writeSharedContext(
  projectPath: string,
  ctx: SharedChainContext,
): Promise<void> {
  const dir = `${projectPath}/.ide`;
  try {
    await fileSystem.mkdir(dir);
  } catch {
    /* exists */
  }
  await fileSystem.writeFile(
    `${dir}/shared-context.json`,
    JSON.stringify(ctx, null, 2),
    { overwrite: true },
  );
}

export async function readSharedContext(
  projectPath: string,
): Promise<SharedChainContext | null> {
  try {
    const raw = await fileSystem.readFile(
      `${projectPath}/.ide/shared-context.json`,
    );
    return JSON.parse(raw as string) as SharedChainContext;
  } catch {
    return null;
  }
}

export function buildShareImportUrl(shareId: string): string {
  const base =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://ide.ton.org/';
  return `${base}?share=${encodeURIComponent(shareId)}`;
}
