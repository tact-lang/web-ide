import Path from '@isomorphic-git/lightning-fs/src/path';
import type { TestRunnerContext, TestRunResult } from './types';

export async function runSandboxTests(
  ctx: TestRunnerContext,
): Promise<TestRunResult> {
  const { projectId, specFile, webcontainer } = ctx;
  const filePath = specFile.startsWith(projectId)
    ? specFile
    : `${projectId}/${specFile}`;

  let stdout = '';
  const capture = (data: string) => {
    stdout += data;
    ctx.log?.(data, 'info');
  };

  try {
    let testCaseCode = '';
    try {
      const chunks = await ctx.compileTs(filePath, projectId);
      testCaseCode = chunks[0]?.code ?? '';
    } catch (error) {
      return {
        success: false,
        exitCode: 1,
        stdout: (error as Error).message,
      };
    }

    const linesToRemove = [
      /import\s+['"]@ton-community\/test-utils['"];/g,
      /import\s+\{[^}]+\}\s+from\s+['"]@ton-community\/blueprint['"];/g,
    ];
    linesToRemove.forEach((pattern) => {
      testCaseCode = testCaseCode.replace(pattern, '');
    });

    const compileBlockExp = /compile\(['"]([^'"]+)['"]\)/g;
    const contractCompileBlock = compileBlockExp.exec(testCaseCode);
    const contractPath = contractCompileBlock?.[1]?.replace(/['"]/g, '');
    const contractAbsolutePath = contractPath
      ? Path.normalize(`${projectId}/${contractPath}`)
      : '';

    if (contractPath?.includes('.fc') && contractCompileBlock) {
      const contract = await ctx.compileFunc(
        { path: contractAbsolutePath },
        projectId,
      );
      const contractBOC = contract.get('contractBOC');
      testCaseCode = testCaseCode.replace(
        contractCompileBlock[0],
        `bocToCell("${contractBOC?.toString('utf-8')}")`,
      );
      testCaseCode = `
        const { Cell } = require("@ton/core");
        ${testCaseCode}
      `;
    }

    testCaseCode = testCaseCode
      .replace(/import\s*'@ton\/test-utils';\s*\n?/, '')
      .replace(/import\s*{/g, 'const {')
      .replace(
        /}\s*from\s*'@ton-community\/sandbox';/,
        '} = require("@ton/sandbox");',
      )
      .replace(/}\s*from\s*'@ton\/sandbox';/, '} = require("@ton/sandbox");')
      .replace(/}\s*from\s*'@ton\/core';/, '} = require("@ton/core");')
      .replace(/}\s*from\s*'ton-core';/, '} = require("@ton/core");');

    testCaseCode = `
    require("@ton/test-utils");
    function bocToCell(codeBoc) {
      return Cell.fromBoc(Buffer.from(codeBoc, "base64"))[0];
    }
    ${testCaseCode}
    `;

    const jsPath = filePath.replace('.spec.ts', '.spec.js');
    const fileName = jsPath.split('/').pop()!;
    if (!webcontainer?.fs) {
      return {
        success: false,
        exitCode: 1,
        stdout: 'WebContainer not initialized',
      };
    }

    await webcontainer.fs.writeFile(fileName, testCaseCode);
    const response = await webcontainer.spawn('npx', ['jest', fileName]);
    await response.output.pipeTo(
      new WritableStream({
        write(data) {
          capture(String(data));
        },
      }),
    );
    const exitCode = response.exit ?? 0;
    const success =
      exitCode === 0 &&
      !stdout.toLowerCase().includes('fail') &&
      !stdout.toLowerCase().includes('error:');
    return { success, exitCode, stdout };
  } catch (error) {
    return {
      success: false,
      exitCode: 1,
      stdout: `${stdout}\n${(error as Error).message}`,
    };
  }
}
