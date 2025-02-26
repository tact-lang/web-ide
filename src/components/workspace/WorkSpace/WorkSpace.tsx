'use client';

import MistiStaticAnalyzer from '@/components/MistiStaticAnalyzer';
import { ManageGit } from '@/components/git';
import { DownloadProject } from '@/components/project';
import { ProjectTemplate } from '@/components/template';
import { NonProductionNotice } from '@/components/ui';
import { AppConfig } from '@/config/AppConfig';
import { useFileTab } from '@/hooks';
import { useLogActivity } from '@/hooks/logActivity.hooks';
import { useProject } from '@/hooks/projectV2.hooks';
import { useSettingAction } from '@/hooks/setting.hooks';
import { Project } from '@/interfaces/workspace.interface';
import { Analytics } from '@/utility/analytics';
import EventEmitter from '@/utility/eventEmitter';
import * as TonCore from '@ton/core';
import * as TonCrypto from '@ton/crypto';
import { Blockchain } from '@ton/sandbox';
import { Buffer } from 'buffer';
import { useRouter } from 'next/router';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import Split from 'react-split';
import { useEffectOnce } from 'react-use';
import BottomPanel from '../BottomPanel/BottomPanel';
import BuildProject from '../BuildProject';
import Editor from '../Editor';
import CodeDiffViewer from '../Editor/CodeDiffViewer';
import Tabs from '../Tabs';
import TestCases from '../TestCases';
import WorkspaceSidebar from '../WorkspaceSidebar';
import { WorkSpaceMenu } from '../WorkspaceSidebar/WorkspaceSidebar';
import { globalWorkspace } from '../globalWorkspace';
import { ManageProject } from '../project';
import FileTree from '../tree/FileTree';
import ItemAction from '../tree/FileTree/ItemActions';
import s from './WorkSpace.module.scss';

type SplitInstance = Split & { split: Split.Instance };

const WorkSpace: FC = () => {
  const { clearLog, createLog } = useLogActivity();

  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState<WorkSpaceMenu>('code');
  const [isLoaded, setIsLoaded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [contract, setContract] = useState<any>('');
  const splitVerticalRef = useRef<SplitInstance | null>(null);

  const { tab } = router.query;
  const { activeProject, setActiveProject, loadProjectFiles } = useProject();

  const { fileTab } = useFileTab();

  const { init: initGlobalSetting } = useSettingAction();

  const createSandbox = async (force: boolean = false) => {
    if (globalWorkspace.sandboxBlockchain && !force) {
      return;
    }
    const blockchain = await Blockchain.create();
    globalWorkspace.sandboxBlockchain = blockchain;
    const wallet = await blockchain.treasury('user');
    globalWorkspace.sandboxWallet = wallet;
  };

  const openProject = async (selectedProjectPath: Project['id']) => {
    if (!selectedProjectPath) {
      createLog(`${selectedProjectPath} - project not found`, 'error');
      return;
    }
    await setActiveProject(selectedProjectPath);
  };

  const cachedProjectPath = useMemo(() => {
    return activeProject?.path as string;
  }, [activeProject]);

  const onKeydown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      EventEmitter.emit('SAVE_FILE');
    }
  };

  const reloadProjectFiles = async (projectPath: string) => {
    if (!projectPath) return;
    await loadProjectFiles(projectPath);
  };

  useEffect(() => {
    if (!cachedProjectPath) return;
    openProject(cachedProjectPath).catch(() => {});
  }, [cachedProjectPath]);

  useEffect(() => {
    if (!activeProject) {
      return;
    }
    createLog(`Project '${activeProject.name}' is opened`);
    createSandbox(true).catch(() => {});

    loadProjectFiles(cachedProjectPath);
  }, [cachedProjectPath]);

  useEffect(() => {
    document.addEventListener('keydown', onKeydown);
    EventEmitter.on('RELOAD_PROJECT_FILES', reloadProjectFiles);
    EventEmitter.on('OPEN_PROJECT', openProject);

    Analytics.track('Project Opened', {
      platform: 'IDE',
      type: 'TON-func',
    });

    return () => {
      try {
        document.removeEventListener('keydown', onKeydown);
        EventEmitter.off('RELOAD_PROJECT_FILES', reloadProjectFiles);
        EventEmitter.off('OPEN_PROJECT', openProject);
        clearLog();
      } catch (error) {
        /* empty */
      }
    };
  }, []);

  useEffect(() => {
    if (tab) {
      setActiveMenu(tab as WorkSpaceMenu);
    }
  }, [tab]);

  useEffectOnce(() => {
    setIsLoaded(true);
    initGlobalSetting();
    window.TonCore = TonCore;
    window.TonCrypto = TonCrypto;
    window.Buffer = Buffer;

    const handleResize = () => {
      if (!splitVerticalRef.current) return;

      splitVerticalRef.current.split.setSizes([5, 95]);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  return (
    <div className={`${s.root} show-file-icons`}>
      <div className={`${s.sidebar} onboarding-workspace-sidebar`}>
        <WorkspaceSidebar
          activeMenu={activeMenu}
          projectName={activeProject?.path ?? ''}
          onMenuClicked={(name) => {
            setActiveMenu(name);
            router
              .replace({
                query: { ...router.query, tab: name },
              })
              .catch(() => {});
          }}
        />
      </div>
      <Split
        ref={splitVerticalRef}
        className={s.splitVertical}
        minSize={250}
        expandToMin={true}
        gutterSize={4}
        sizes={[5, 95]}
        onDragEnd={() => {
          EventEmitter.emit('ON_SPLIT_DRAG_END');
        }}
      >
        <div className={s.tree}>
          {isLoaded && activeMenu === 'code' && (
            <div className="onboarding-file-explorer">
              <span className={s.heading}>Explorer</span>
              <ManageProject />
              {activeProject?.path && (
                <div className={s.globalAction}>
                  <span>{AppConfig.name}</span>
                  <div className={s.actionWrapper}>
                    <ItemAction
                      className={s.visible}
                      allowedActions={['NewFile', 'NewFolder']}
                      onNewFile={() => {
                        EventEmitter.emit('CREATE_ROOT_FILE_OR_FOLDER', 'file');
                      }}
                      onNewDirectory={() => {
                        EventEmitter.emit(
                          'CREATE_ROOT_FILE_OR_FOLDER',
                          'directory',
                        );
                      }}
                    />
                    <DownloadProject
                      path={activeProject.path}
                      title={`Download ${activeProject.name}`}
                    />
                  </div>
                </div>
              )}

              <FileTree projectId={activeProject?.path as string} />
            </div>
          )}
          {activeMenu === 'build' && globalWorkspace.sandboxBlockchain && (
            <BuildProject
              projectId={activeProject?.path as string}
              onCodeCompile={(_codeBOC) => {}}
              contract={contract}
              updateContract={(contractInstance) => {
                setContract(contractInstance);
              }}
            />
          )}
          {activeMenu === 'test-cases' && (
            <div className={s.commonContainer}>
              <TestCases projectId={activeProject?.path as string} />
            </div>
          )}
          {activeMenu === 'misti' && (
            <div className={s.commonContainer}>
              <MistiStaticAnalyzer />
            </div>
          )}
          {activeMenu === 'git' && (
            <div className={s.commonContainer}>
              <ManageGit />
            </div>
          )}
        </div>
        <div className={`${s.workArea} onboarding-code-editor`}>
          {isLoaded && (
            <>
              <Split
                className={s.splitHorizontal}
                minSize={50}
                gutterSize={4}
                sizes={[80, 20]}
                direction="vertical"
                onDragEnd={() => {
                  EventEmitter.emit('ON_SPLIT_DRAG_END');
                }}
              >
                <div>
                  <NonProductionNotice />
                  <div className={s.tabsWrapper}>
                    <Tabs />
                  </div>
                  <div style={{ height: 'calc(100% - 43px)' }}>
                    {fileTab.active ? (
                      fileTab.active.type === 'git' ? (
                        <CodeDiffViewer />
                      ) : (
                        <Editor />
                      )
                    ) : (
                      <ProjectTemplate />
                    )}
                  </div>
                </div>
                <div>
                  <BottomPanel />
                </div>
              </Split>
            </>
          )}
        </div>
      </Split>
    </div>
  );
};

export default WorkSpace;
