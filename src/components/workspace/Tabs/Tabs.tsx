import AppIcon from '@/components/ui/icon';
import { useFileTab } from '@/hooks';
import { useProject } from '@/hooks/projectV2.hooks';
import EventEmitter from '@/utility/eventEmitter';
import { delay, fileTypeFromFileName } from '@/utility/utils';
import { FC, useEffect } from 'react';
import s from './Tabs.module.scss';

interface IRenameFile {
  oldPath: string;
  newPath: string;
}

const Tabs: FC = () => {
  const { fileTab, open, close, rename, syncTabSettings, updateFileDirty } =
    useFileTab();
  const { activeProject } = useProject();

  const closeTab = (e: React.MouseEvent, filePath: string) => {
    e.preventDefault();
    e.stopPropagation();
    close(filePath);
  };

  const onFileSave = ({ filePath }: { filePath: string }) => {
    updateFileDirty(filePath, false);
  };

  const onFileRename = ({ oldPath, newPath }: IRenameFile) => {
    rename(oldPath, newPath);
  };

  useEffect(() => {
    (async () => {
      await delay(200);
      syncTabSettings();
    })();
  }, [activeProject]);

  useEffect(() => {
    EventEmitter.on('FILE_SAVED', onFileSave);
    EventEmitter.on('FILE_RENAMED', onFileRename);
    return () => {
      EventEmitter.off('FILE_SAVED', onFileSave);
      EventEmitter.off('FILE_RENAMED', onFileRename);
    };
  }, [updateFileDirty]);

  if (fileTab.items.length === 0) {
    return <></>;
  }
  return (
    <div className={s.container}>
      <div className={s.tabList}>
        {fileTab.items.map((item) => (
          <div
            onClick={() => {
              open(item.name, item.path, item.type);
            }}
            className={`${s.item} 
            file-icon
            ${item.name.split('.').pop()}-lang-file-icon
            ${fileTypeFromFileName(item.name)}-lang-file-icon
               ${item.path === fileTab.active?.path ? s.isActive : ''}
              `}
            key={item.path}
          >
            {item.name}
            {item.type === 'git' && ' (git)'}
            <span
              className={`${s.close} ${item.isDirty ? s.isDirty : ''}`}
              onClick={(e) => {
                closeTab(e, item.path);
              }}
            >
              <span className={s.fileDirtyIcon}></span>
              <AppIcon name="Close" className={s.closeIcon} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tabs;
