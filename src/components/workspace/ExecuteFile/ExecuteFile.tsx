import AppIcon, { AppIconType } from '@/components/ui/icon';
import { useFileTab } from '@/hooks';
import { useLogActivity } from '@/hooks/logActivity.hooks';
import { useProjectActions } from '@/hooks/project.hooks';
import { useProject } from '@/hooks/projectV2.hooks';
import { useSettingAction } from '@/hooks/setting.hooks';
import { useWorkspaceActions } from '@/hooks/workspace.hooks';
import { Project, Tree } from '@/interfaces/workspace.interface';
import EventEmitter from '@/utility/eventEmitter';
import { relativePath } from '@/utility/filePath';
import { getFileExtension } from '@/utility/utils';
import { App, Button, Select } from 'antd';
import { FC, useEffect, useRef, useState } from 'react';
import s from './ExecuteFile.module.scss';

type ButtonClick =
  | React.MouseEvent<HTMLButtonElement, MouseEvent>
  | React.MouseEvent<HTMLAnchorElement, MouseEvent>
  | React.MouseEvent<HTMLElement, MouseEvent>;

interface Props {
  projectId: Project['id'];
  onCompile?: () => void;
  onClick?: (e: ButtonClick, data: string) => void;
  label?: string;
  icon?: AppIconType;
  description?: string;
  allowedFile: string[];
}

const ExecuteFile: FC<Props> = ({
  projectId,
  onCompile,
  onClick,
  label = 'Compile',
  icon = '',
  description = '',
  allowedFile = [],
}) => {
  const { compileTsFile } = useWorkspaceActions();
  const {
    projectFiles,
    updateContractBuild,
    activeProject,
    updateProjectSetting,
  } = useProject();
  const { compileFuncProgram, compileTactProgram } = useProjectActions();
  const { createLog } = useLogActivity();
  const { hasDirtyFiles } = useFileTab();
  const [selectedFile, setSelectedFile] = useState<Tree['path'] | undefined>();
  const selectedFileRef = useRef<Tree['path'] | undefined>();
  const isAutoBuildAndDeployEnabled =
    useSettingAction().isAutoBuildAndDeployEnabled();
  const { message } = App.useApp();

  const isAutoBuildAndDeployEnabledRef = useRef(false);

  const fileList = projectFiles.filter((file: Tree | null) => {
    if (!file || !activeProject?.path) {
      return false;
    }
    const fileExtension = getFileExtension(file.name);
    const relativeFilePath = relativePath(file.path, activeProject.path);
    if (file.name === 'stdlib.fc' || relativeFilePath.startsWith('dist/'))
      return false;
    return allowedFile.includes(fileExtension as string);
  });

  async function handleContractCompilation(
    compileFn: (
      args: { path: string },
      projectId: string,
    ) => Promise<Map<string, Buffer>>,
    entryFile: string,
  ) {
    if (!entryFile) return;
    try {
      const outputFiles = await compileFn({ path: entryFile }, projectId);

      const abiCollection = Array.from(outputFiles.keys())
        .filter((file) => getFileExtension(file) === 'abi')
        .map((f) => f.replace(/^\/?dist\/?/, ''));

      await updateContractBuild({
        contractFile: relativePath(entryFile, activeProject?.path as string),
        abiCollection: abiCollection,
      });

      if (onCompile) {
        onCompile();
      }
      createLog('Contract Built Successfully', 'success');
    } catch (error) {
      const errorMessage = (error as Error).message.split('\n');
      for (const message of errorMessage) {
        createLog(message, 'error', true, true);
      }
    }
  }

  const buildFile = async (e: ButtonClick) => {
    if (hasDirtyFiles()) {
      message.warning({
        content: 'You have unsaved changes',
        key: 'unsaved_changes',
      });
    }
    const entryFile = selectedFileRef.current;
    if (!entryFile) {
      createLog('Please select a file', 'error');
      return;
    }
    const fileExtension = getFileExtension(entryFile) ?? '';

    try {
      switch (fileExtension) {
        case 'ts':
          await compileTsFile(entryFile, projectId);
          break;
        case 'spec.ts':
          if (!onClick || !entryFile) return;
          onClick(e, entryFile);
          break;
        case 'fc': {
          await handleContractCompilation(compileFuncProgram, entryFile);
          break;
        }
        case 'tact':
          await handleContractCompilation(compileTactProgram, entryFile);
          break;
      }
    } catch (error) {
      if (typeof error === 'string') {
        createLog(error, 'error');
        return;
      }
      await message.error(
        'Something went wrong. Check browser console for more details',
      );
      console.log('error', error);
    }
  };

  const updateSelectedContract = (path?: string) => {
    if (path && !['tact', 'fc'].includes(getFileExtension(path) ?? '')) {
      path = undefined;
    }
    updateProjectSetting({
      selectedContract: path,
    });
  };

  const selectFile = (
    e: number | string | undefined | React.ChangeEvent<HTMLSelectElement>,
  ) => {
    if (e === undefined) {
      updateSelectedContract(undefined);
      setSelectedFile(undefined);
      return;
    }
    const selectedFile = fileList.find((f) => {
      if (typeof e === 'string') return f.path === e;
      return (
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        f.id === (e as React.ChangeEvent<HTMLSelectElement>)?.target?.value
      );
    });
    updateSelectedContract(selectedFile?.path);
    setSelectedFile(selectedFile?.path);
  };

  const onFileSaved = () => {
    if (!isAutoBuildAndDeployEnabledRef.current) return;
    if (!selectedFileRef.current) return;
    buildFile({} as ButtonClick).catch(() => {});
  };

  useEffect(() => {
    selectedFileRef.current = selectedFile;
    if (selectedFile) {
      updateSelectedContract(selectedFile);
    }
  }, [selectedFile]);

  useEffect(() => {
    isAutoBuildAndDeployEnabledRef.current = isAutoBuildAndDeployEnabled;
  }, [isAutoBuildAndDeployEnabled]);

  useEffect(() => {
    if (fileList.length > 0) {
      setSelectedFile(fileList[0].path);
    }
    EventEmitter.on('FILE_SAVED', onFileSaved);
    if (
      activeProject?.selectedContract &&
      allowedFile.includes(
        getFileExtension(activeProject.selectedContract) ?? '',
      )
    ) {
      setSelectedFile(activeProject.selectedContract);
    }
    return () => {
      EventEmitter.off('FILE_SAVED', onFileSaved);
    };
  }, []);

  return (
    <div className={s.root}>
      {description && (
        <p
          className={s.desc}
          dangerouslySetInnerHTML={{ __html: description }}
        ></p>
      )}
      <Select
        placeholder="Select a file"
        notFoundContent="Required file not found"
        allowClear
        showSearch
        className="w-100"
        defaultActiveFirstOption
        value={fileList.length > 0 ? selectedFile : undefined}
        onChange={selectFile}
        filterOption={(inputValue, option) => {
          return !!option?.title
            ?.toLowerCase()
            .includes(inputValue.toLowerCase());
        }}
      >
        {fileList.map((f) => (
          <Select.Option key={f.path} value={f.path} title={f.path}>
            {f.name}
          </Select.Option>
        ))}
      </Select>
      <Button
        type="primary"
        className={`${s.action} ant-btn-primary-gradient w-100`}
        disabled={!selectedFile}
        onClick={(e) => {
          buildFile(e).catch(() => {});
        }}
      >
        {icon && <AppIcon name={icon as AppIconType} />}
        {label}
      </Button>
    </div>
  );
};

export default ExecuteFile;
