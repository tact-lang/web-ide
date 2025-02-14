import AppIcon, { AppIconType } from '@/components/ui/icon';
import { useFileTab } from '@/hooks';
import { useLogActivity } from '@/hooks/logActivity.hooks';
import { useProjectActions } from '@/hooks/project.hooks';
import { useProject } from '@/hooks/projectV2.hooks';
import { useSettingAction } from '@/hooks/setting.hooks';
import { useWorkspaceActions } from '@/hooks/workspace.hooks';
import { Project, Tree } from '@/interfaces/workspace.interface';
import EventEmitter from '@/utility/eventEmitter';
import { getFileExtension } from '@/utility/utils';
import { App, Button, Select } from 'antd';
import { FC, useEffect, useRef, useState } from 'react';
import s from './ExecuteFile.module.scss';

type ButtonClick =
  | React.MouseEvent<HTMLButtonElement, MouseEvent>
  | React.MouseEvent<HTMLAnchorElement, MouseEvent>;
interface Props {
  projectId: Project['id'];
  onCompile?: () => void;
  onClick?: (e: ButtonClick, data: string) => void;
  label?: string;
  icon?: AppIconType;
  description?: string;
  allowedFile: string[];
  disabled?: boolean;
}

const ExecuteFile: FC<Props> = ({
  projectId,
  onCompile,
  onClick,
  label = 'Compile',
  icon = '',
  description = '',
  allowedFile = [],
  disabled = false,
}) => {
  const { compileTsFile } = useWorkspaceActions();
  const { projectFiles } = useProject();
  const { compileFuncProgram, compileTactProgram } = useProjectActions();
  const { createLog } = useLogActivity();
  const { hasDirtyFiles } = useFileTab();
  const [selectedFile, setSelectedFile] = useState<Tree | undefined>();
  const selectedFileRef = useRef<Tree | undefined>();
  const isAutoBuildAndDeployEnabled =
    useSettingAction().isAutoBuildAndDeployEnabled();
  const { message } = App.useApp();

  const isAutoBuildAndDeployEnabledRef = useRef(false);

  const fileList = projectFiles.filter((f: Tree | null) => {
    const _fileExtension = getFileExtension(f?.name ?? '');
    if (f?.name === 'stdlib.fc') return false;
    return allowedFile.includes(_fileExtension as string);
  });

  const buildFile = async (e: ButtonClick) => {
    if (hasDirtyFiles()) {
      message.warning({
        content: 'You have unsaved changes',
        key: 'unsaved_changes',
      });
    }
    const selectedFile = selectedFileRef.current;
    if (!selectedFile) {
      createLog('Please select a file', 'error');
      return;
    }
    const _fileExtension = getFileExtension(selectedFile.name) ?? '';

    try {
      switch (_fileExtension) {
        case 'ts':
          await compileTsFile(selectedFile.path, projectId);
          break;
        case 'spec.ts':
          if (!onClick || !selectedFile.path) return;
          onClick(e, selectedFile.path);
          break;
        case 'fc':
          await compileFuncProgram(selectedFile, projectId);
          if (onCompile) {
            onCompile();
          }
          createLog('Contract Built Successfully', 'success');
          break;

        case 'tact':
          try {
            (await compileTactProgram(selectedFile, projectId)) as Map<
              string,
              Buffer
            >;

            if (onCompile) {
              onCompile();
            }
            createLog('Built Successfully', 'success');
          } catch (error) {
            const errorMessage = (error as Error).message.split('\n');
            for (const message of errorMessage) {
              createLog(message, 'error', true, true);
            }
          }
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

  const selectFile = (
    e: number | string | undefined | React.ChangeEvent<HTMLSelectElement>,
  ) => {
    if (e === undefined) {
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
    setSelectedFile(selectedFile);
  };

  const onFileSaved = () => {
    if (!isAutoBuildAndDeployEnabledRef.current) return;
    if (!selectedFileRef.current) return;
    buildFile({} as ButtonClick).catch(() => {});
  };

  useEffect(() => {
    selectedFileRef.current = selectedFile;
  }, [selectedFile]);

  useEffect(() => {
    isAutoBuildAndDeployEnabledRef.current = isAutoBuildAndDeployEnabled;
  }, [isAutoBuildAndDeployEnabled]);

  useEffect(() => {
    setSelectedFile(fileList[0]);
    EventEmitter.on('FILE_SAVED', onFileSaved);
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
        value={selectedFile?.path}
        onChange={selectFile}
        filterOption={(inputValue, option) => {
          return option?.title.toLowerCase().includes(inputValue.toLowerCase());
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
        disabled={!selectedFile || disabled}
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
