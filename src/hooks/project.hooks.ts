import { Project, Tree } from '@/interfaces/workspace.interface';
import fileSystem from '@/lib/fs';
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
import {
  FactoryAst,
  getAstFactory,
} from '@tact-lang/compiler/dist/ast/ast-helpers';
import { featureEnable } from '@tact-lang/compiler/dist/config/features';
import { CompilerContext } from '@tact-lang/compiler/dist/context/context';
import { Parser, getParser } from '@tact-lang/compiler/dist/grammar';
import stdLibFiles from '@tact-lang/compiler/dist/stdlib/stdlib';
import {
  CompileResult,
  SuccessResult,
  compileFunc,
} from '@ton-community/func-js';
import useFile from './file.hooks';
import { useProject } from './projectV2.hooks';
import { useSettingAction } from './setting.hooks';

export function useProjectActions() {
  const { isContractDebugEnabled, getSettingStateByKey } = useSettingAction();
  const { writeFiles, projectFiles, activeProject } = useProject();
  const { getFile } = useFile();
  const isExternalMessage = getSettingStateByKey('isExternalMessage');

  return {
    compileFuncProgram,
    compileTactProgram,
  };

  async function compileFuncProgram(
    file: Pick<Tree, 'path'>,
    projectId: Project['id'],
  ) {
    const fileList: Record<string, string> = {};

    const filesToProcess = [file.path];

    while (filesToProcess.length !== 0) {
      const singleFileToProcess = filesToProcess.pop();
      const fileContent = await getFile(singleFileToProcess!);
      if (!fileContent) {
        continue;
      }
      fileList[singleFileToProcess!] = fileContent as string;
      let compileDirectives = await extractCompilerDiretive(
        fileContent as string,
      );

      compileDirectives = compileDirectives.map((d: string) => {
        const pathParts = file.path.split('/');
        // if (!pathParts) {
        //   return d;
        // }

        // Convert relative path to absolute path by prepending the current file directory
        if (pathParts.length > 1) {
          const fileDirectory = pathParts
            .slice(0, pathParts.length - 1)
            .join('/');
          return `${fileDirectory}/${d}`;
        }

        return d;
      });
      if (compileDirectives.length === 0) {
        continue;
      }
      filesToProcess.push(...compileDirectives);
    }
    const buildResult: CompileResult = await compileFunc({
      targets: [file.path!],
      sources: (path) => {
        return fileList[path] ?? '';
      },
    });

    if (buildResult.status === 'error') {
      throw new Error(buildResult.message);
    }

    const abi = await generateABI(fileList);

    const contractName = file.path
      .replace(`${projectId}/`, '')
      .replace('.fc', '');
    const buildFiles = [
      {
        path: `${projectId}/dist/func_${contractName}.abi`,
        content: JSON.stringify({
          name: contractName,
          getters: abi,
          setters: [],
        }),
        type: 'file' as const,
      },
      {
        path: `${projectId}/dist/func_${contractName}.code.boc`,
        content: (buildResult as SuccessResult).codeBoc,
        type: 'file' as const,
      },
    ];
    await writeFiles(projectId, buildFiles, { overwrite: true });
    return new Map<string, Buffer>([
      ...buildFiles.map<[string, Buffer]>((file) => [
        relativePath(file.path, projectId),
        Buffer.from(file.content),
      ]),
      ['contractBOC', Buffer.from((buildResult as SuccessResult).codeBoc)],
      ['snapshot', Buffer.from(JSON.stringify(buildResult.snapshot))],
    ]);
  }

  async function compileTactProgram(
    file: Pick<Tree, 'path'>,
    projectId: Project['id'],
  ) {
    const filesToProcess = [file.path];

    projectFiles.forEach((f) => {
      if (
        /\.(tact|fc|func)$/.test(f.name) &&
        !filesToProcess.includes(f.path) &&
        !f.path.startsWith('dist/')
      ) {
        filesToProcess.push(f.path);
      }
    });

    const fs = new OverwritableVirtualFileSystem();

    while (filesToProcess.length !== 0) {
      const fileToProcess = filesToProcess.pop();
      const fileContent = await fileSystem.readFile(fileToProcess!);
      if (fileContent) {
        fs.writeContractFile(
          relativePath(fileToProcess!, activeProject?.path as string),
          fileContent as string,
        );
      }
    }

    let ctx = new CompilerContext();
    const stdlib = createVirtualFileSystem('@stdlib', stdLibFiles);
    if (isExternalMessage) {
      ctx = featureEnable(ctx, 'external');
    }

    const entryFile = relativePath(file.path, activeProject?.path as string);

    const ast: FactoryAst = getAstFactory();
    const parser: Parser = getParser(ast);

    ctx = precompile(ctx, fs, stdlib, entryFile, parser, ast);

    const response = await buildTact({
      config: {
        path: `/${entryFile}`,
        output: 'dist',
        name: 'tact',
        options: {
          debug: isContractDebugEnabled(),
          external: !!isExternalMessage,
        },
      },
      project: fs,
      stdlib: '@stdlib',
      logger: new TactLogger(LogLevel.DEBUG),
    });
    if (!response.ok) {
      throw new Error('Error while building');
    }

    const output = {
      abi: '',
      boc: '',
      contractScript: {
        name: '',
        value: Buffer.from(''),
      },
    };

    fs.overwrites.forEach((value, key) => {
      if (key.includes('.abi')) {
        output.abi = JSON.parse(value.toString());
      } else if (key.includes('.boc')) {
        output.boc = value.toString('base64');
      } else if (key.includes('.ts')) {
        output.contractScript = {
          name: key,
          value,
        };
      }
    });

    const buildFiles: Pick<Tree, 'path' | 'content' | 'type'>[] = [];
    fs.overwrites.forEach((value, key) => {
      const filePath = `${projectId}/${key.slice(1)}`;

      let fileContent = value.toString();
      if (key.includes('.abi')) {
        const contractName = key
          .replace('/dist/', '')
          .replace('.abi', '')
          .replace('tact_', '');
        fileContent = JSON.parse(fileContent);
        const parsedFileContent = {
          ...(fileContent as Partial<Tree>),
          init: getContractInitParams(ctx, contractName),
        };
        fileContent = JSON.stringify(parsedFileContent);
      }
      if (key.includes('.boc')) {
        fileContent = value.toString('base64');
      }
      buildFiles.push({
        path: filePath,
        content: fileContent,
        type: 'file',
      });
      // TODO: Do this after the build files are updated.
      // EventEmitter.emit('FORCE_UPDATE_FILE', filePath);
    });

    await writeFiles(projectId, buildFiles, { overwrite: true });
    return fs.overwrites;
  }

  async function generateABI(fileList: Record<string, string>) {
    const unresolvedPromises = Object.values(fileList).map(async (file) => {
      return await parseGetters(file);
    });
    const results = await Promise.all(unresolvedPromises);
    return results[0];
  }
}
