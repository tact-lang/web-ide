import { useFile, useFileTab } from '@/hooks';
import { useLogActivity } from '@/hooks/logActivity.hooks';
import { useProject } from '@/hooks/projectV2.hooks';
import { Project, Tree } from '@/interfaces/workspace.interface';
import EventEmitter from '@/utility/eventEmitter';
import { encodeBase64, fileTypeFromFileName } from '@/utility/utils';
import { NodeModel, RenderParams } from '@minoru/react-dnd-treeview';
import { App } from 'antd';
import cn from 'clsx';
import { FC, useState } from 'react';
import { INewItem } from './FileTree';
import s from './FileTree.module.scss';
import ItemAction, { actionsTypes } from './ItemActions';
import TreePlaceholderInput from './TreePlaceholderInput';

interface Props extends RenderParams {
  node: NodeModel<TreeNodeData>;
  depth: number;
  isOpen: boolean;
  onToggle: () => void;
  projectId: Project['id'];
  isDragging: boolean;
  newItemToCreate: INewItem | null;
  setNewItemToCreate: (data: INewItem | null) => void;
  commitItemCreation: () => void;
}

export interface TreeNodeData {
  path: string;
}

const TreeNode: FC<Props> = ({
  node,
  depth,
  isOpen,
  onToggle,
  newItemToCreate,
  setNewItemToCreate,
  commitItemCreation,
}) => {
  const { droppable } = node;
  const indent = depth * 15;

  const [isEditing, setIsEditing] = useState(false);

  const { deleteProjectFile, renameProjectFile } = useProject();
  const { open: openTab } = useFileTab();
  const { createLog } = useLogActivity();
  const { getFile } = useFile();
  const { message } = App.useApp();

  const disallowedFile = [
    'message.cell.ts',
    'stateInit.cell.ts',
    'test.spec.js',
    'setting.json',
  ];

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
    if (!node.droppable) {
      openTab(node.text, node.data?.path as string);
    }
  };

  const handleItemAction = () => {
    if (!isAllowed()) {
      return;
    }
    setIsEditing(true);
  };

  const commitEditing = async (name: string) => {
    try {
      const { success, oldPath, newPath } = await renameProjectFile(
        node.data?.path as string,
        name,
      );
      if (success && newPath) {
        EventEmitter.emit('FILE_RENAMED', {
          oldPath,
          newPath,
        });
      }
      reset();
    } catch (error) {
      createLog((error as Error).message, 'error');
    }
  };

  const updateItemTypeCreation = (type: Tree['type']) => {
    if (!isAllowed()) return;
    if (node.droppable && !isOpen) {
      onToggle();
    }
    if (!node.data) return;
    setNewItemToCreate({ type, parentPath: node.data.path, name: '' });
  };

  const reset = () => {
    document.body.classList.remove('editing-file-folder');
    setIsEditing(false);
    setNewItemToCreate(null);
  };

  const isSystemFile = (fileName: string) => {
    return disallowedFile.includes(fileName);
  };

  const getAllowedActions = () => {
    if (isSystemFile(node.text)) {
      return [];
    }
    if (node.droppable) {
      return ['Edit', 'NewFile', 'NewFolder', 'Close'];
    }
    const options = ['Edit', 'Close'];
    const allowedLanguages = ['tact', 'func'];
    if (allowedLanguages.includes(fileTypeFromFileName(node.text))) {
      options.push('Share');
    }
    return options;
  };

  const deleteItemFromNode = async () => {
    const nodePath = node.data?.path;
    if (!nodePath) {
      createLog(`'${nodePath}' not found`, 'error');
      return;
    }

    await deleteProjectFile(nodePath);
  };

  const onShare = async () => {
    try {
      const fileContent =
        ((await getFile(node.data?.path as string)) as string) || '';
      const maxAllowedCharacters = 32779; // Maximum allowed characters in a Chrome. Firefox has more limit but we are using less for compatibility
      if (!fileContent) {
        message.error('File is empty');
        return;
      }
      if (fileContent && fileContent.length > maxAllowedCharacters) {
        message.error(
          `File is too large to share. Maximum allowed characters is ${maxAllowedCharacters}`,
        );
        return;
      }
      const language = fileTypeFromFileName(node.text);
      const shareableLink = `${window.location.origin}/#code=${encodeURIComponent(encodeBase64(fileContent))}&lang=${language}`;

      navigator.clipboard.writeText(shareableLink);

      message.success("File's shareable link copied to clipboard");
    } catch (error) {
      message.error((error as Error).message);
    }
  };

  const isAllowed = () => {
    const isEditingItem = document.body.classList.contains(
      'editing-file-folder',
    );
    if (!isEditingItem) {
      document.body.classList.add('editing-file-folder');
      return true;
    }
    return false;
  };

  const rootClassName = cn(s.treeNode, {
    [s.isOpen]: isOpen,
    'folder-name monaco-icon-label': true,
    'file-icon': !droppable,
    'folder-icon': droppable,
    'folder-icon-open': droppable && isOpen,
    [`${node.text.split('.').pop()}-lang-file-icon`]: !droppable,
    [`${fileTypeFromFileName(node.text)}-lang-file-icon`]: !droppable,
  });

  // Hide ./ide/settings.json file
  if (node.data?.path.includes('.ide')) {
    return null;
  }

  return (
    <>
      <div
        className={rootClassName}
        style={{ paddingInlineStart: indent }}
        onClick={handleClick}
      >
        {!isEditing && (
          <div
            className={`${s.item} ${
              isSystemFile(node.text) ? s.systemFile : ''
            }`}
          >
            <span>{node.text}</span>
            <ItemAction
              className={s.actions}
              onRename={() => {
                handleItemAction();
              }}
              allowedActions={getAllowedActions() as actionsTypes[]}
              onNewFile={() => {
                updateItemTypeCreation('file');
              }}
              onNewDirectory={() => {
                updateItemTypeCreation('directory');
              }}
              onDelete={() => {
                deleteItemFromNode().catch(() => {});
              }}
              onShare={() => {
                onShare();
              }}
            />
          </div>
        )}

        {isEditing && (
          <TreePlaceholderInput
            type={node.droppable ? 'directory' : 'file'}
            defaultValue={node.text}
            onSubmit={commitEditing}
            onCancel={reset}
          />
        )}
      </div>
      {newItemToCreate && newItemToCreate.parentPath === node.data?.path && (
        <TreePlaceholderInput
          style={{ paddingInlineStart: 15 * (depth + 1) }}
          onSubmit={commitItemCreation}
          onCancel={reset}
          type={newItemToCreate.type}
        />
      )}
    </>
  );
};

export default TreeNode;
