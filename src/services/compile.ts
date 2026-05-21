import type { Tree } from '@/interfaces/workspace.interface';
import { OverwritableVirtualFileSystem } from '@/utility/OverwritableVirtualFileSystem';
import { getContractInitParams } from '@/utility/abi';
import { relativePath } from '@/utility/filePath';
import { extractCompilerDiretive, parseGetters } from '@/utility/getterParser';
import TactLogger from '@/utility/tactLogger';
import {
  LogLevel,
  build as buildTact,
  createVirtualFileSystem,
  precompile,
} from '@tact-lang/compiler';
import { featureEnable } from '@tact-lang/compiler/dist/config/features';
import { CompilerContext } from '@tact-lang/compiler/dist/context/context';
import { files as stdLibFiles } from '@tact-lang/compiler/dist/stdlib/stdlib';
import {
  type CompileResult,
  type SuccessResult,
  compileFunc,
} from '@ton-community/func-js';
import fileSystem from '@/lib/fs';
import { writeProjectFiles } from './projectFs';
import type { CompileContext, CompileResultPayload } from './types';

async function generateFuncABI(fileList: Record<string, string>) {
  const results = await Promise.all(
    Object.values(fileList).map((file) => parseGetters(file)),
  );
  return results[0];
}

export async function compileFuncContract(
  ctx: CompileContext,
  entryFile: string,
): Promise<CompileResultPayload> {
  const file: Pick<Tree, 'path'> = { path: `${ctx.projectPath}/${entryFile}` };
  const fileList: Record<string, string> = {};
  const filesToProcess = [file.path];

  while (filesToProcess.length > 0) {
    const singleFileToProcess = filesToProcess.pop()!;
    let fileContent: string;
    try {
      fileContent = (await fileSystem.readFile(singleFileToProcess)) as string;
    } catch {
      continue;
    }
    fileList[singleFileToProcess] = fileContent;
    let compileDirectives = await extractCompilerDiretive(fileContent);
    compileDirectives = compileDirectives.map((d: string) => {
      const pathParts = file.path.split('/');
      if (pathParts.length > 1) {
        const fileDirectory = pathParts.slice(0, pathParts.length - 1).join('/');
        return `${fileDirectory}/${d}`;
      }
      return d;
    });
    filesToProcess.push(...compileDirectives);
  }

  const buildResult: CompileResult = await compileFunc({
    targets: [file.path],
    sources: (path) => fileList[path] ?? '',
  });

  if (buildResult.status === 'error') {
    return {
      success: false,
      artifacts: [],
      errors: [buildResult.message],
    };
  }

  const abi = await generateFuncABI(fileList);
  const contractName = entryFile.replace('.fc', '').replace(/^.*\//, '');
  const buildFiles = [
    {
      path: `${ctx.projectPath}/dist/func_${contractName}.abi`,
      content: JSON.stringify({
        name: contractName,
        getters: abi,
        setters: [],
      }),
      type: 'file' as const,
    },
    {
      path: `${ctx.projectPath}/dist/func_${contractName}.code.boc`,
      content: (buildResult as SuccessResult).codeBoc,
      type: 'file' as const,
    },
  ];
  await writeProjectFiles(ctx.projectPath, buildFiles, { overwrite: true });
  ctx.log?.(`Compiled FunC: ${contractName}`, 'success');
  return {
    success: true,
    artifacts: buildFiles.map((f) => f.path.replace(`${ctx.projectPath}/`, '')),
    errors: [],
    contractBOC: (buildResult as SuccessResult).codeBoc,
  };
}

export async function compileTactContract(
  ctx: CompileContext,
  entryFile: string,
): Promise<CompileResultPayload> {
  const filesToProcess = [`${ctx.projectPath}/${entryFile}`];
  ctx.projectFiles.forEach((f) => {
    if (
      /\.(tact|fc|func)$/.test(f.name) &&
      !filesToProcess.includes(f.path) &&
      !f.path.startsWith(`${ctx.projectPath}/dist/`)
    ) {
      filesToProcess.push(f.path);
    }
  });

  const fs = new OverwritableVirtualFileSystem();
  while (filesToProcess.length > 0) {
    const fileToProcess = filesToProcess.pop()!;
    const fileContent = await fileSystem.readFile(fileToProcess);
    if (fileContent) {
      fs.writeContractFile(
        relativePath(fileToProcess, ctx.projectPath),
        fileContent as string,
      );
    }
  }

  let compilerCtx = new CompilerContext();
  const stdlib = createVirtualFileSystem('@stdlib', stdLibFiles);
  if (ctx.isExternalMessage) {
    compilerCtx = featureEnable(compilerCtx, 'external');
  }

  const entryRelative = entryFile.replace(/^\//, '');
  compilerCtx = precompile(compilerCtx, fs, stdlib, entryRelative);

  const response = await buildTact({
    config: {
      path: `/${entryRelative}`,
      output: 'dist',
      name: 'tact',
      options: {
        debug: !!ctx.isContractDebugEnabled,
        external: !!ctx.isExternalMessage,
      },
    },
    project: fs,
    stdlib: '@stdlib',
    logger: new TactLogger(LogLevel.DEBUG),
  });

  if (!response.ok) {
    return {
      success: false,
      artifacts: [],
      errors: ['Tact build failed'],
    };
  }

  const buildFiles: Pick<Tree, 'path' | 'content' | 'type'>[] = [];
  fs.overwrites.forEach((value, key) => {
    const filePath = `${ctx.projectPath}/${key.slice(1)}`;
    let fileContent = value.toString();
    if (key.includes('.abi')) {
      const contractName = key
        .replace('/dist/', '')
        .replace('.abi', '')
        .replace('tact_', '');
      const parsed = JSON.parse(fileContent);
      fileContent = JSON.stringify({
        ...parsed,
        init: getContractInitParams(compilerCtx, contractName),
      });
    }
    if (key.includes('.boc')) {
      fileContent = value.toString('base64');
    }
    buildFiles.push({ path: filePath, content: fileContent, type: 'file' });
  });

  await writeProjectFiles(ctx.projectPath, buildFiles, { overwrite: true });
  ctx.log?.(`Compiled Tact: ${entryRelative}`, 'success');
  return {
    success: true,
    artifacts: buildFiles.map((f) => f.path.replace(`${ctx.projectPath}/`, '')),
    errors: [],
  };
}

export async function compileContract(
  ctx: CompileContext,
  entryFile: string,
): Promise<CompileResultPayload> {
  if (ctx.language === 'func') {
    return compileFuncContract(ctx, entryFile);
  }
  if (ctx.language === 'tact') {
    return compileTactContract(ctx, entryFile);
  }
  if (ctx.language === 'tolk') {
    const { compileTolkContract } = await import('./compileTolk');
    return compileTolkContract(ctx, entryFile);
  }
  return { success: false, artifacts: [], errors: ['Unknown language'] };
}
