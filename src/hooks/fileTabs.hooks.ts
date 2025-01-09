import { IDEContext, IFileTab } from '@/state/IDE.context';
import EventEmitter from '@/utility/eventEmitter';
import {
  DEFAULT_PROJECT_SETTING,
  updateProjectTabSetting,
} from '@/utility/projectSetting';
import cloneDeep from 'lodash.clonedeep';
import { useContext } from 'react';

const useFileTab = () => {
  const { fileTab, setFileTab, activeProject } = useContext(IDEContext);

  const updateTabs = (tabs: IFileTab) => {
    setFileTab(tabs);
  };

  const open = async (name: string, path: string) => {
    if (fileTab.active === path || !activeProject?.path) return;

    const existingTab = fileTab.items.find((item) => item.path === path);

    if (existingTab) {
      updateTabs(
        await updateProjectTabSetting(activeProject.path, {
          ...fileTab,
          active: path,
        }),
      );
    } else {
      const newTab = { name, path, isDirty: false };
      const updatedTab = {
        ...fileTab,
        items: [...fileTab.items, newTab],
        active: path,
      };
      updateTabs(await updateProjectTabSetting(activeProject.path, updatedTab));
    }
  };

  const close = async (
    filePath: string | null,
    action: 'close' | 'closeAll' | 'closeOthers' = 'close',
  ) => {
    let updatedTab: IFileTab;

    if (action === 'closeAll') {
      updatedTab = DEFAULT_PROJECT_SETTING.tab;
    } else if (action === 'closeOthers' && filePath) {
      updatedTab = closeOtherTabs(filePath, fileTab);
    } else {
      updatedTab = closeSingleTab(filePath, fileTab);
    }

    updateTabs(
      await updateProjectTabSetting(activeProject?.path as string, updatedTab),
    );
  };

  const rename = async (oldPath: string, newPath: string) => {
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
    const isActiveTab = fileTab.active === oldPath;

    const updatedTab = {
      items: updatedItems,
      active: isActiveTab ? newPath : fileTab.active, // Set the active tab to the new path if it was renamed
    };

    updateTabs(
      await updateProjectTabSetting(activeProject?.path as string, updatedTab),
    );
    EventEmitter.emit('FORCE_UPDATE_FILE', newPath);
  };

  const updateFileDirty = async (filePath: string, isDirty: boolean) => {
    const updatedItems = cloneDeep(fileTab).items.map((item) => {
      if (item.path === filePath) {
        return { ...item, isDirty: isDirty };
      }
      return item;
    });

    const updatedTab = { ...fileTab, items: updatedItems };
    updateTabs(
      await updateProjectTabSetting(activeProject?.path as string, updatedTab),
    );
  };

  const hasDirtyFiles = () => {
    return fileTab.items.some((item) => item.isDirty);
  };

  return {
    fileTab,
    open,
    close,
    rename,
    updateFileDirty,
    hasDirtyFiles,
  };
};

/**
 * Close all tabs except the specified one.
 */
function closeOtherTabs(filePath: string, fileTab: IFileTab): IFileTab {
  const updatedItems = fileTab.items.filter((item) => item.path === filePath);
  return {
    items: updatedItems,
    active: updatedItems.length > 0 ? updatedItems[0].path : null,
  };
}

/**
 * Close a single tab and determine the next active tab.
 */
function closeSingleTab(filePath: string | null, fileTab: IFileTab): IFileTab {
  const updatedItems = fileTab.items.filter((item) => item.path !== filePath);

  let newActiveTab = fileTab.active;
  if (fileTab.active === filePath) {
    const closedTabIndex = fileTab.items.findIndex(
      (item) => item.path === filePath,
    );
    if (updatedItems.length > 0) {
      newActiveTab =
        closedTabIndex > 0
          ? updatedItems[closedTabIndex - 1].path
          : updatedItems[0].path;
    } else {
      newActiveTab = null; // No more tabs open
    }
  }

  return { items: updatedItems, active: newActiveTab };
}

export default useFileTab;
