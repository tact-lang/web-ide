import fileSystem from '@/lib/fs';
import { IDEContext, IFileTab } from '@/state/IDE.context';
import EventEmitter from '@/utility/eventEmitter';
import cloneDeep from 'lodash.clonedeep';
import { useContext } from 'react';

const useFileTab = () => {
  const { fileTab, setFileTab, activeProject } = useContext(IDEContext);

  const syncTabSettings = async (updatedTab?: IFileTab) => {
    if (!activeProject || Object.keys(activeProject).length === 0) return;

    const defaultSetting = {
      tab: {
        items: [],
        active: null,
      },
    };

    try {
      const settingPath = `${activeProject.path}/.ide/setting.json`;
      if (!(await fileSystem.exists(settingPath))) {
        await fileSystem.writeFile(
          settingPath,
          JSON.stringify(defaultSetting, null, 4),
          {
            overwrite: true,
          },
        );
      }
      const setting = (await fileSystem.readFile(settingPath)) as string;

      let parsedSetting = setting ? JSON.parse(setting) : defaultSetting;

      if (updatedTab) {
        parsedSetting.tab = updatedTab;
      } else {
        parsedSetting = {
          ...defaultSetting,
          ...parsedSetting,
        };
      }
      setFileTab(cloneDeep(parsedSetting.tab));

      await fileSystem.writeFile(
        settingPath,
        JSON.stringify(parsedSetting, null, 2),
        {
          overwrite: true,
        },
      );
      EventEmitter.emit('FORCE_UPDATE_FILE', settingPath);
    } catch (error) {
      console.error('Error syncing tab settings:', error);
    }
  };

  const open = (
    name: string,
    path: string,
    type: 'default' | 'git' = 'default',
  ) => {
    if (fileTab.active?.path === path) return;

    const existingTab = fileTab.items.find((item) => item.path === path);

    if (existingTab) {
      const updatedTab = { ...fileTab, active: { path, type }, type };
      syncTabSettings(updatedTab);
    } else {
      const newTab = { name, path, isDirty: false, type };
      const updatedTab = {
        ...fileTab,
        items: [...fileTab.items, newTab],
        active: { path, type },
      };
      syncTabSettings(updatedTab);
    }
  };

  const close = (filePath: string, closeAll: boolean = false) => {
    let updatedTab: IFileTab;

    if (closeAll) {
      updatedTab = { items: [], active: null };
    } else {
      const updatedItems = fileTab.items.filter(
        (item) => item.path !== filePath,
      );

      let newActiveTab = fileTab.active;
      if (fileTab.active?.path === filePath) {
        const closedTabIndex = fileTab.items.findIndex(
          (item) => item.path === filePath,
        );
        if (updatedItems.length > 0 && newActiveTab) {
          if (closedTabIndex > 0) {
            newActiveTab.path = updatedItems[closedTabIndex - 1].path;
            newActiveTab.type = updatedItems[closedTabIndex - 1].type;
          } else {
            newActiveTab.path = updatedItems[0].path;
            newActiveTab.type = updatedItems[0].type;
          }
        } else {
          newActiveTab = null; // No more tabs open
        }
      }

      updatedTab = { items: updatedItems, active: newActiveTab };
    }

    syncTabSettings(updatedTab);
  };

  const rename = (oldPath: string, newPath: string) => {
    const updatedItems = fileTab.items.map((item) => {
      if (item.path === oldPath) {
        return {
          ...item,
          path: newPath,
          name: newPath.split('/').pop() ?? item.name,
        };
      }
      return item;
    });

    // Check if the old path was the active tab
    const isActiveTab = fileTab.active?.path === oldPath;

    const updatedTab = {
      items: updatedItems,
      active: isActiveTab
        ? { path: newPath, type: 'default' as const }
        : { path: fileTab.active?.path ?? '', type: 'default' as const }, // Set the active tab to the new path if it was renamed
    };

    syncTabSettings(updatedTab);
    EventEmitter.emit('FORCE_UPDATE_FILE', newPath);
  };

  const updateFileDirty = (filePath: string, isDirty: boolean) => {
    const updatedItems = cloneDeep(fileTab).items.map((item) => {
      if (item.path === filePath) {
        return { ...item, isDirty: isDirty };
      }
      return item;
    });

    const updatedTab = { ...fileTab, items: updatedItems };
    syncTabSettings(updatedTab);
  };

  const hasDirtyFiles = () => {
    return fileTab.items.some((item) => item.isDirty);
  };

  return {
    fileTab,
    open,
    close,
    rename,
    syncTabSettings,
    updateFileDirty,
    hasDirtyFiles,
  };
};

export default useFileTab;
