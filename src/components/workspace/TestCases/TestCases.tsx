/* eslint-disable no-useless-escape */
import { useFile } from '@/hooks';
import { useLogActivity } from '@/hooks/logActivity.hooks';
import { useProjectActions } from '@/hooks/project.hooks';
import { useProject } from '@/hooks/projectV2.hooks';
import { useWorkspaceActions } from '@/hooks/workspace.hooks';
import { useWebContainer } from '@/state/WebContainer.context';
import { Analytics } from '@/utility/analytics';
import EventEmitter from '@/utility/eventEmitter';
import { isChromiumBased } from '@/utility/utils';
import { LoadingOutlined } from '@ant-design/icons';
import Path from '@isomorphic-git/lightning-fs/src/path';
import { Spin } from 'antd';
import { FC, useEffect } from 'react';
import ExecuteFile from '../ExecuteFile';
import s from './TestCases.module.scss';

interface Props {
  projectId: string;
}

const TestCases: FC<Props> = ({ projectId }) => {
  const { createLog } = useLogActivity();

  const { compileTsFile } = useWorkspaceActions();
  const { getFile } = useFile();
  const { compileFuncProgram } = useProjectActions();
  const { activeProject } = useProject();

  const {
    webcontainer,
    status: webcontainerStatus,
    init: initializeWebcontainer,
  } = useWebContainer();

  const isLoading = webcontainerStatus && webcontainerStatus !== 'loaded';

  const executeTestCases = async (filePath: string) => {
    let testCaseCode = '';

    try {
      testCaseCode = (await compileTsFile(filePath, projectId))[0].code;
    } catch (error) {
      if ((error as Error).message) {
        createLog((error as Error).message, 'error');
        return;
      }
      console.log(error);
      return;
    }

    // if (!cellBuilderRef.current?.contentWindow) return;

    const linesToRemove = [
      /import\s+['"]@ton-community\/test-utils['"];/g,
      /import\s+\{[^}]+\}\s+from\s+['"]@ton-community\/blueprint['"];/g,
    ];

    linesToRemove.forEach((pattern) => {
      testCaseCode = testCaseCode.replace(pattern, '');
    });

    // const compileBlockExp = /compile[^(]*\(([^)]*)\)/;
    const compileBlockExp = /compile\(['"]([^'"]+)['"]\)/g;

    const contractCompileBlock = compileBlockExp.exec(testCaseCode);
    const contractPath = contractCompileBlock?.[1].replace(/['"]/g, '');

    const contractAbsolutePath = Path.normalize(`${projectId}/${contractPath}`);
    // if (!contractPath) {
    //   createLog('Please specify contract path', 'error');
    //   return;
    // }
    let contractFile = undefined;
    try {
      contractFile = await getFile(contractAbsolutePath);
    } catch (error) {
      /* empty */
    }
    if (contractPath && !contractFile) {
      createLog(
        `Contract file not found - ${contractPath}. Define correct absolute path. Ex. contracts/main.fc or /contracts/main.fc`,
        'error',
      );
      return;
    }

    let contractBOC = undefined;

    if (contractPath && contractCompileBlock && contractPath.includes('.fc')) {
      try {
        const contract = await compileFuncProgram(
          { path: contractAbsolutePath },
          projectId,
        );
        contractBOC = contract.contractBOC;
        testCaseCode = testCaseCode.replace(
          contractCompileBlock[0],
          `bocToCell("${contractBOC}")`,
        );
        testCaseCode = `
        const {
        Cell,
      } = require("@ton/core");
        ${testCaseCode}
        `;
      } catch (error) {
        let _error = '';
        if (typeof error === 'string') {
          _error = error;
        } else if ((error as Error).message) {
          _error = (error as Error).message;
        }
        if (_error) {
          createLog(_error, 'error');
        }
      }
    }

    testCaseCode = testCaseCode
      .replace(/import\s*\'@ton-community\/test-utils\';+$/, '')
      .replace(/import\s*'@ton\/test-utils';\s*\n?/, '')
      .replace(/import\s*{/g, 'const {')
      .replace(
        /}\s*from\s*'@ton-community\/sandbox';/,
        '} = require("@ton/sandbox");',
      )
      .replace(/}\s*from\s*'@ton\/sandbox';/, '} = require("@ton/sandbox");')
      .replace(/}\s*from\s*'@ton\/core';/, '} = require("@ton/core");')
      .replace(/}\s*from\s*'ton-core';/, '} = require("@ton/core");');

    // eslint-disable-next-line no-useless-escape
    testCaseCode = `
    require("@ton\/test-utils");
    function bocToCell(codeBoc) {
      return Cell.fromBoc(Buffer.from(codeBoc, "base64"))[0];
    }
    
    ${testCaseCode}
    `;

    await runIt(filePath, testCaseCode);
  };

  const runIt = async (filePath: string, codeBase: string) => {
    filePath = filePath.replace('.spec.ts', '.spec.js');

    if (!webcontainer?.path) {
      return;
    }
    createLog('Running test cases...', 'info', true);
    const fileName = filePath.split('/').pop();
    await webcontainer.fs.writeFile(fileName!, codeBase);

    const response = await webcontainer.spawn('npx', ['jest', fileName!]);

    await response.output.pipeTo(
      new WritableStream({
        write(data) {
          EventEmitter.emit('LOG', data);
        },
      }),
    );
    Analytics.track('Execute Test Case', {
      platform: 'IDE',
      type: `TON-${activeProject?.language}`,
    });
  };

  const displayBrowserSupportWarning = () => {
    if (isChromiumBased()) {
      return <></>;
    }
    return (
      <div className={s.note}>
        <p>
          ⚠️ <strong>Best supported on Chromium-based browsers.</strong>
        </p>
        <p>
          Please use <strong>Google Chrome, Edge, or Brave</strong> for the best
          experience.
        </p>

        <p>
          See the full{' '}
          <a
            href="https://webcontainers.io/guides/browser-support"
            target="_blank"
            rel="noopener noreferrer"
          >
            browser support guide
          </a>
        </p>
      </div>
    );
  };

  useEffect(() => {
    if (webcontainer) return;
    initializeWebcontainer();
  }, []);

  return (
    <div className={s.root}>
      <h3 className={`sidebar-section-title`}>Unit Test</h3>

      <ExecuteFile
        projectId={projectId}
        allowedFile={['spec.ts']}
        label={`Run`}
        description="Select .spec.ts file to run test cases"
        disabled={webcontainerStatus !== 'loaded'}
        onClick={(e, data) => {
          if (!webcontainer) {
            createLog('Testing environment is not initialized');
          }
          if (isLoading) return;
          executeTestCases(data).catch(() => {});
        }}
      />
      {isLoading && (
        <div className={s.webcontainerStatus}>
          <Spin indicator={<LoadingOutlined spin />} size="small" />
          {webcontainerStatus}
        </div>
      )}
      {displayBrowserSupportWarning()}
    </div>
  );
};

export default TestCases;
