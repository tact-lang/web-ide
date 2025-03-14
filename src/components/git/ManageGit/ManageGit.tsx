import { Tooltip } from '@/components/ui';
import AppIcon from '@/components/ui/icon';
import { useFileTab } from '@/hooks';
import { useProject } from '@/hooks/projectV2.hooks';
import { IGitWorkerMessage, InitRepo } from '@/interfaces/git.interface';
import GitManager from '@/lib/git';
import EventEmitter from '@/utility/eventEmitter';
import { CaretRightOutlined } from '@ant-design/icons';
import { Button, Collapse, theme } from 'antd';
import { ReadCommitResult } from 'isomorphic-git';
import { FC, useEffect, useRef, useState } from 'react';
import CommitChanges from '../CommitChanges';
import GitRemote from '../GitRemote';
import GitSetting from '../GitSetting';
import GitSync from '../GitSync';
import s from './ManageGit.module.scss';

interface IFileCollection {
  path: string;
  status: 'U' | 'A' | 'M' | 'D' | 'C';
  staged: boolean;
}

const ManageGit: FC = () => {
  const workerRef = useRef<Worker>();
  const { activeProject } = useProject();
  const { open: openTab } = useFileTab();
  const [isGitInitialized, setIsGitInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fileCollection, setFileCollection] = useState<IFileCollection[]>([]);
  const [commitHistory, setCommitHistory] = useState<ReadCommitResult[]>([]);
  const git = new GitManager();
  const { token: themeToken } = theme.useToken();

  const panelStyle: React.CSSProperties = {
    marginBottom: 10,
    background: themeToken.colorFillAlter,
    borderRadius: themeToken.borderRadiusLG,
    border: 'none',
  };

  const filteredFiles = (type: 'staged' | 'changed') => {
    if (type === 'staged') {
      return fileCollection.filter((file) => file.staged);
    }
    return fileCollection.filter(
      (file) =>
        (file.status === 'M' && !file.staged) ||
        file.status === 'U' ||
        file.status === 'C',
    );
  };

  const stagedFiles = filteredFiles('staged');
  const unstagedFiles = filteredFiles('changed');

  const initGit = () => {
    if (!activeProject?.path) {
      console.log('Project path not found');
      return;
    }

    const workerMessage: IGitWorkerMessage<InitRepo> = {
      type: 'init',
      payload: {
        data: {
          projectPath: activeProject.path,
        },
      },
    };
    if (workerRef.current) {
      workerRef.current.postMessage(workerMessage);
    }
  };

  const getFilesToCommit = () => {
    workerRef.current?.postMessage({
      type: 'getFilesToCommit',
      payload: { data: { projectPath: activeProject?.path } },
    });
  };

  const handleFiles = (
    filePath: string,
    action: 'add' | 'unstage',
    all = false,
  ) => {
    if (!activeProject?.path) return;

    let files = [];
    if (all) {
      const filterType = action === 'add' ? 'changed' : 'staged';
      files = filteredFiles(filterType).map((file) => ({ path: file.path }));
      if (files.length === 0) return;
    } else {
      files = [{ path: filePath }];
    }

    workerRef.current?.postMessage({
      type: action === 'add' ? 'addFiles' : 'unstageFile',
      payload: {
        data: { files, projectPath: activeProject.path },
      },
    });
  };

  const getCommitHistory = async () => {
    if (!activeProject?.path) return;
    try {
      const commits = await git.log(activeProject.path);
      setCommitHistory(commits);
    } catch (error) {
      setCommitHistory([]);
    }
  };

  const onMount = async () => {
    if (!activeProject?.path) return;
    const _isInitialized = await git.isInitialized(activeProject.path);
    setIsGitInitialized(_isInitialized);
    if (_isInitialized) {
      getFilesToCommit();
    }
    setIsLoading(false);
    getCommitHistory();
  };

  const onFileClick = (file: IFileCollection) => {
    console.log(file);
    const { path } = file;
    openTab(path.split('/').pop()!, path, 'git');
  };

  useEffect(() => {
    onMount();
    workerRef.current = new Worker(
      new URL('@/workers/git.ts', import.meta.url),
      {
        type: 'module',
      },
    );
    workerRef.current.onmessage = (e) => {
      const { type, projectPath } = e.data;

      if (type === 'GIT_INITIALIZED') {
        EventEmitter.emit('RELOAD_PROJECT_FILES', projectPath);
        setIsGitInitialized(true);
      } else if (type === 'FILES_TO_COMMIT') {
        setFileCollection(e.data.payload);
      }
      const actionsForReload = [
        'GIT_INITIALIZED',
        'FILES_ADDED',
        'FILE_UNSTAGED',
      ];
      if (actionsForReload.includes(type)) {
        getFilesToCommit();
      }
    };
    workerRef.current.onerror = (error) => {
      console.error('Worker error:', error);
    };

    EventEmitter.on('FILE_SAVED', getFilesToCommit);
    EventEmitter.on('GIT_PULL_FINISHED', getCommitHistory);
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
      EventEmitter.off('FILE_SAVED', getFilesToCommit);
      EventEmitter.off('GIT_PULL_FINISHED', getCommitHistory);
    };
  }, []);

  if (!activeProject?.path || isLoading) {
    return <></>;
  }

  const renderCategoryWiseFiles = (
    files: IFileCollection[],
    staged: boolean,
  ) => {
    return (
      <ul>
        {files.map((file) => (
          <li
            key={file.path}
            className={s.fileItem}
            onClick={() => {
              onFileClick(file);
            }}
          >
            <div className={s.fileDetails}>
              {file.path.split('/').pop()}{' '}
              <span className={s.filePath}>
                {file.path.split('/').slice(0, -1).join('/')}
              </span>
            </div>
            <Tooltip title={staged ? 'Unstage file' : 'Stage file'}>
              <span
                className={s.action}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleFiles(file.path, staged ? 'unstage' : 'add');
                }}
              >
                <AppIcon name={staged ? 'Minus' : 'Plus2'} />
              </span>
            </Tooltip>

            <div className={s.status}>{file.status}</div>
          </li>
        ))}
      </ul>
    );
  };

  const renderFiles = () => {
    if (!fileCollection.length) {
      return <div>No changes</div>;
    }
    const header = (staged = false) => {
      return (
        <div className={s.collapseHeader}>
          {staged ? 'Staged' : 'Changes'}
          <Tooltip title={staged ? 'Unstage all' : 'Stage all'}>
            <span
              className={s.action}
              onClick={() => {
                handleFiles('none', staged ? 'unstage' : 'add', true);
              }}
            >
              <AppIcon name={staged ? 'Minus' : 'Plus2'} />
            </span>
          </Tooltip>
        </div>
      );
    };
    return (
      <div>
        <Collapse
          className={s.collapse}
          defaultActiveKey={['staged', 'unstaged', 'remote', 'sync', 'setting']}
          bordered={false}
          expandIcon={({ isActive }) => (
            <CaretRightOutlined rotate={isActive ? 90 : 0} />
          )}
          style={{ background: 'transparent' }}
        >
          {stagedFiles.length > 0 && (
            <Collapse.Panel
              header={header(true)}
              className={s.collapsePanel}
              key="staged"
              style={panelStyle}
            >
              {renderCategoryWiseFiles(stagedFiles, true)}
            </Collapse.Panel>
          )}

          <Collapse.Panel
            header={header(false)}
            className={s.collapsePanel}
            key="unstaged"
            style={panelStyle}
          >
            {renderCategoryWiseFiles(unstagedFiles, false)}
          </Collapse.Panel>
          <Collapse.Panel
            header="Remote"
            key="remote"
            className={s.collapsePanel}
            style={panelStyle}
          >
            <GitRemote />
          </Collapse.Panel>
          <Collapse.Panel
            header="Sync"
            key="sync"
            className={s.collapsePanel}
            style={panelStyle}
          >
            <GitSync />
          </Collapse.Panel>
          {commitHistory.length > 0 && (
            <Collapse.Panel
              header="Commit History"
              className={s.collapsePanel}
              key="history"
              style={panelStyle}
            >
              {commitHistory.map(({ oid, commit }) => (
                <div key={oid} className={s.commitItem}>
                  <div className={s.commitMessage}>{commit.message}</div>
                  <div className={s.commitAuthor}>
                    {commit.author.name} - {commit.author.email}
                  </div>
                </div>
              ))}
            </Collapse.Panel>
          )}
          <Collapse.Panel
            header="Setting"
            key="setting"
            className={s.collapsePanel}
            style={panelStyle}
          >
            <GitSetting />
          </Collapse.Panel>
        </Collapse>
      </div>
    );
  };

  return (
    <div className={s.root}>
      <h3 className={`text-center section-heading`}>Git Version Control</h3>
      {!isGitInitialized && (
        <Button
          type="primary"
          className={`item-center-align w-100`}
          onClick={() => {
            initGit();
          }}
        >
          <AppIcon name="GitBranch" /> Initialize Git
        </Button>
      )}
      {stagedFiles.length > 0 && (
        <CommitChanges
          onCommit={() => {
            getFilesToCommit();
            getCommitHistory();
          }}
        />
      )}

      {isGitInitialized && renderFiles()}
    </div>
  );
};

export default ManageGit;
