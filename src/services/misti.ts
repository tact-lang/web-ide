import { normalizeRelativePath } from '@/utility/path';
import { mistiFormatResult } from '@/utility/utils';
import Path from '@isomorphic-git/lightning-fs/src/path';
import {
  BROWSER_STDLIB_PATH_ELEMENTS,
  BuiltInDetectors,
  Severity,
} from '@nowarp/misti/dist';
import { Driver } from '@nowarp/misti/dist/cli/driver';
import { createVirtualFileSystem } from '@nowarp/misti/dist/vfs/createVirtualFileSystem';
import { files as stdLibFiles } from '@tact-lang/compiler/dist/stdlib/stdlib';
import fileSystem from '@/lib/fs';
import type { MistiContext } from './types';

const unSupportedDetectors = [
  'DivideBeforeMultiply',
  'ReadOnlyVariables',
  'UnboundLoop',
];

export async function runMistiAnalysis(ctx: MistiContext): Promise<{
  success: boolean;
  findings: { severity: string; message: string }[];
}> {
  const vfs = createVirtualFileSystem('/', {}, false);

  for (const file of ctx.projectFiles) {
    if (!file.path.endsWith('.tact')) continue;
    const content = await fileSystem.readFile(file.path);
    vfs.writeFile(
      normalizeRelativePath(file.path, ctx.projectPath),
      content as string,
    );
  }

  for (const [path, content] of Object.entries(stdLibFiles)) {
    const stdLibPath = Path.resolve(...BROWSER_STDLIB_PATH_ELEMENTS, path);
    vfs.writeFile(stdLibPath, content as string);
  }

  const driver = await Driver.create(
    [normalizeRelativePath(ctx.selectedPath, ctx.projectPath)],
    {
      allDetectors: true,
      fs: vfs,
      enabledDetectors: Object.keys(BuiltInDetectors).filter(
        (k) => !unSupportedDetectors.includes(k),
      ),
      minSeverity: ctx.minSeverity ?? Severity.INFO,
      listDetectors: false,
      souffle: false,
      tactStdlibPath: Path.resolve(...BROWSER_STDLIB_PATH_ELEMENTS),
      newDetector: undefined,
    },
  );

  const result = await driver.execute();
  const formatted = mistiFormatResult(result);
  return {
    success: true,
    findings: formatted.map((f) => ({
      severity: f.type,
      message: f.message,
    })),
  };
}
