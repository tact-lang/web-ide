import { ContextMenu } from '@/components/ui';
import AppIcon from '@/components/ui/icon';
import { useFileTab } from '@/hooks';
import { Tree } from '@/interfaces/workspace.interface';
import { ITabItems } from '@/state/IDE.context';
import EventEmitter from '@/utility/eventEmitter';
import { fileTypeFromFileName } from '@/utility/utils';
import type { MenuProps } from 'antd';
import cn from 'clsx';
import type { MenuInfo } from 'rc-menu/lib/interface';
import { FC, useCallback, useEffect } from 'react';
import s from './Tabs.module.scss';

interface IRenameFile {
  oldPath: string;
  newPath: string;
}

type ContextMenuKeys = 'close' | 'closeOthers' | 'closeAll';

interface ContextMenuItem {
  key: ContextMenuKeys;
  label: string;
}

interface IContextMenuItems extends MenuProps {
  key: ContextMenuKeys;
  items: ContextMenuItem[];
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
  const { fileTab, open, close, rename } = useFileTab();

  const closeTab = (e: React.MouseEvent, filePath: string) => {
    e.preventDefault();
    e.stopPropagation();
    close(filePath);
  };

  const onMenuItemClick = useCallback(
    (info: MenuInfo, filePath: Tree['path']) => {
      close(filePath, info.key as ContextMenuKeys);
    },
    [close],
  );

  const onFileRename = useCallback(
    ({ oldPath, newPath }: IRenameFile) => {
      if (fileTab.items.length === 0) return;
      rename(oldPath, newPath);
    },
    [rename],
  );

  const computeTabClassNames = (item: ITabItems) => {
    const fileExtension = item.name.split('.').pop() ?? '';
    const fileTypeClass = fileTypeFromFileName(item.name);

    return cn(
      s.item,
      'file-icon',
      `${fileExtension}-lang-file-icon`,
      `${fileTypeClass}-lang-file-icon`,
      { [s.isActive]: item.path === fileTab.active?.path },
    );
  };

  const renderCloseButton = (item: ITabItems) => (
    <span
      className={s.close}
      onClick={(e) => {
        closeTab(e, item.path);
      }}
    >
      <AppIcon name="Close" className={s.closeIcon} />
    </span>
  );

  useEffect(() => {
    EventEmitter.on('FILE_RENAMED', onFileRename);
    return () => {
      EventEmitter.off('FILE_RENAMED', onFileRename);
    };
  }, []);

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
                open(item.name, item.path, item.type);
              }}
              className={computeTabClassNames(item)}
            >
              {item.name}
              {item.type === 'git' && ' (git)'}
              {renderCloseButton(item)}
            </div>
          </ContextMenu>
        ))}
      </div>
    </div>
  );
};

export default Tabs;
