import { ContextMenu } from '@/components/ui';
import AppIcon from '@/components/ui/icon';
import { useFileTab } from '@/hooks';
import { useProject } from '@/hooks/projectV2.hooks';
import { Tree } from '@/interfaces/workspace.interface';
import { ITabItems } from '@/state/IDE.context';
import EventEmitter from '@/utility/eventEmitter';
import { delay, fileTypeFromFileName } from '@/utility/utils';
import type { MenuProps } from 'antd';
import cn from 'clsx';
import type { MenuInfo } from 'rc-menu/lib/interface';
import { FC, useEffect } from 'react';
import s from './Tabs.module.scss';

interface IRenameFile {
  oldPath: string;
  newPath: string;
}

type ContextMenuKeys = 'close' | 'closeOthers' | 'closeAll';

interface IContextMenuItems extends MenuProps {
  key: ContextMenuKeys;
  items: {
    key: ContextMenuKeys;
    label: string;
  }[];
}

const contextMenuItems: IContextMenuItems['items'] = [
  {
    key: 'close',
    label: 'Close',
  },
  {
    key: 'closeOthers',
    label: 'Close Others',
  },
  {
    key: 'closeAll',
    label: 'Close All',
  },
];

const Tabs: FC = () => {
  const { fileTab, open, close, rename, syncTabSettings, updateFileDirty } =
    useFileTab();
  const { activeProject } = useProject();

  const closeTab = (e: React.MouseEvent, filePath: string) => {
    e.preventDefault();
    e.stopPropagation();
    close(filePath);
  };

  const onMenuItemClick = (info: MenuInfo, filePath: Tree['path']) => {
    close(filePath, info.key as ContextMenuKeys);
  };
  const onFileSave = ({ filePath }: { filePath: string }) => {
    updateFileDirty(filePath, false);
  };

  const onFileRename = ({ oldPath, newPath }: IRenameFile) => {
    rename(oldPath, newPath);
  };

  const computeTabClassNames = (item: ITabItems) => {
    const fileExtension = item.name.split('.').pop() ?? '';
    const fileTypeClass = fileTypeFromFileName(item.name);

    return cn(
      s.item,
      'file-icon',
      `${fileExtension}-lang-file-icon`,
      `${fileTypeClass}-lang-file-icon`,
      { [s.isActive]: item.path === fileTab.active },
    );
  };

  const renderCloseButton = (item: ITabItems) => (
    <span
      className={cn(s.close, { [s.isDirty]: item.isDirty })}
      onClick={(e) => {
        closeTab(e, item.path);
      }}
    >
      {item.isDirty && <span className={s.fileDirtyIcon}></span>}
      <AppIcon name="Close" className={s.closeIcon} />
    </span>
  );

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
          <ContextMenu
            key={item.path}
            menu={{
              items: contextMenuItems,
              onClick: (info) => {
                onMenuItemClick(info, item.path);
              },
            }}
          >
            <div
              onClick={() => {
                open(item.name, item.path);
              }}
              className={computeTabClassNames(item)}
            >
              {item.name}
              {renderCloseButton(item)}
            </div>
          </ContextMenu>
        ))}
      </div>
    </div>
  );
};

export default Tabs;
