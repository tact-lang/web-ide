import { useFileTab } from '@/hooks';
import { useLogActivity } from '@/hooks/logActivity.hooks';
import { useProject } from '@/hooks/projectV2.hooks';
import { Tree as ITree } from '@/interfaces/workspace.interface';
import EventEmitter from '@/utility/eventEmitter';
import { relativePath } from '@/utility/filePath';
import Path from '@isomorphic-git/lightning-fs/src/path';
import {
  DropOptions,
  getBackendOptions,
  MultiBackend,
  NodeModel,
  Tree,
} from '@minoru/react-dnd-treeview';
import { FC, useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import s from './FileTree.module.scss';
import TreeNode, { TreeNodeData } from './TreeNode';
import TreePlaceholderInput from './TreePlaceholderInput';

interface Props {
  projectId: string;
}
export interface INewItem {
  name: string;
  type: ITree['type'];
  parentPath: string;
}

const FileTree: FC<Props> = ({ projectId }) => {
  const { activeProject, projectFiles, moveItem, newFileFolder } = useProject();
  const { open: openTab } = useFileTab();
  const { createLog } = useLogActivity();

  const [newItem, setNewItem] = useState<INewItem | null>(null);

  const getProjectFiles = (): NodeModel[] => {
    if (!activeProject?.path) return [];
    return projectFiles.map((item) => {
      return {
        id: item.path,
        parent: item.parent ? item.parent : (activeProject.path as string),
        droppable: item.type === 'directory',
        text: item.name,
        data: {
          path: item.path,
        },
      };
    });
  };

  const handleDrop = async (_: unknown, options: DropOptions) => {
    await moveItem(
      options.dragSourceId as string,
      options.dropTargetId as string,
    );
  };

  const commitItemCreation = async (name?: string) => {
    if (!newItem || !activeProject?.path) return;

    const itemName = name ?? newItem.name;
    const absolutePath = Path.join(newItem.parentPath, itemName);
    const relativeFilePath = relativePath(absolutePath, activeProject.path);
    try {
      await newFileFolder(relativeFilePath, newItem.type);
      if (newItem.type === 'file') {
        openTab(itemName, absolutePath);
      }
      reset();
    } catch (error) {
      createLog((error as Error).message, 'error');
    }
  };

  const reset = () => {
    document.body.classList.remove('editing-file-folder');
    setNewItem(null);
  };

  const handleRootItemCreation = (type: ITree['type']) => {
    if (!activeProject?.path) return;
    setNewItem({
      type,
      parentPath: activeProject.path,
      name: '',
    });
  };

  useEffect(() => {
    EventEmitter.on('CREATE_ROOT_FILE_OR_FOLDER', handleRootItemCreation);

    return () => {
      reset();
      EventEmitter.on('CREATE_ROOT_FILE_OR_FOLDER', handleRootItemCreation);
    };
  }, []);

  if (!activeProject?.path) return null;

  return (
    <div className={s.root}>
      <DndProvider backend={MultiBackend} options={getBackendOptions()}>
        <Tree
          tree={getProjectFiles()}
          rootId={activeProject.path}
          onDrop={handleDrop}
          render={(node, { depth, isOpen, onToggle }) => {
            return (
              <TreeNode
                projectId={projectId as string}
                node={node as NodeModel<TreeNodeData>}
                depth={depth}
                isOpen={isOpen}
                onToggle={onToggle}
                newItem={newItem}
                commitItemCreation={commitItemCreation}
                setNewItem={(data: INewItem | null) => {
                  if (!data) {
                    reset();
                    return;
                  }
                  const { name, type, parentPath } = data;
                  setNewItem({
                    name,
                    type,
                    parentPath,
                  });
                }}
              />
            );
          }}
        />
      </DndProvider>
      {newItem?.parentPath === activeProject.path && (
        <TreePlaceholderInput
          style={{ paddingInlineStart: 15 }}
          onSubmit={commitItemCreation}
          onCancel={reset}
          type={newItem.type}
        />
      )}
    </div>
  );
};

export default FileTree;
