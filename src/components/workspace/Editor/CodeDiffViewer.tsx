import { useTheme } from '@/components/shared/ThemeProvider';
import { useFile, useFileTab } from '@/hooks';
import { useLogActivity } from '@/hooks/logActivity.hooks';
import { useProject } from '@/hooks/projectV2.hooks';
import { Tree } from '@/interfaces/workspace.interface';
import GitManager from '@/lib/git';
import { configureMonacoEditor } from '@/utility/editor';
import {
  debounce,
  fileTypeFromFileName,
  isErrorWithCode,
} from '@/utility/utils';
import Path from '@isomorphic-git/lightning-fs/src/path';
import { DiffEditor } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { FC, useEffect, useRef, useState } from 'react';
import s from './Editor.module.scss';
import { editorOptions } from './shared';

const CodeDiffViewer: FC = () => {
  const git = new GitManager();
  const blankContent = { oldContent: '', latestContent: '' };
  const [diff, setDiff] = useState(blankContent);

  const { activeProject } = useProject();
  const { fileTab } = useFileTab();
  const { getFile, saveFile } = useFile();
  const logger = useLogActivity();
  const { theme } = useTheme();

  const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(
    null,
  );

  function handleEditorDidMount(editor: monaco.editor.IStandaloneDiffEditor) {
    diffEditorRef.current = editor;

    const modifiedModel = editor.getModifiedEditor().getModel();
    if (!modifiedModel) {
      return;
    }

    const handleDebouncedChange = debounce(async () => {
      const updatedContent = modifiedModel.getValue();
      if (!fileTab.active?.path || !activeProject?.path) return;
      try {
        const filePath = Path.resolve(activeProject.path, fileTab.active.path);
        await saveFile(filePath, updatedContent);
      } catch (error) {
        /* empty */
      }
    }, 500);

    modifiedModel.onDidChangeContent(() => {
      handleDebouncedChange();
    });
  }

  async function getFileContentFromCommit(
    commitHash: string,
    basePath: string,
    path: Tree['path'],
  ) {
    try {
      const { blob } = await git.readBlob(commitHash, basePath, path);
      return new TextDecoder().decode(blob); // Decode file content to string
    } catch (error) {
      if (isErrorWithCode(error) && error.code === 'NotFoundError') {
        return '';
      }
    }
  }

  async function fetchDiffContent() {
    if (!activeProject?.path || !fileTab.active?.path) {
      setDiff(blankContent);
      return;
    }

    try {
      const filePath = Path.resolve(activeProject.path, fileTab.active.path);

      const latestContent = await getFile(filePath);
      const lastCommit = await git.getOldCommit(activeProject.path, 0);
      if (!lastCommit) {
        setDiff({ oldContent: '', latestContent: latestContent.toString() });
        return;
      }
      const oldContent = await getFileContentFromCommit(
        lastCommit,
        activeProject.path,
        fileTab.active.path,
      );
      setDiff({
        oldContent: oldContent ?? '',
        latestContent: latestContent.toString(),
      });
    } catch (error) {
      let message = 'An error occurred while fetching content';
      if (error instanceof Error) {
        message = error.message;
      }
      logger.createLog(message, 'error');
    }
  }

  useEffect(() => {
    if (!fileTab.active) return;

    configureMonacoEditor(fileTab.active.path);
  }, []);

  useEffect(() => {
    fetchDiffContent();
  }, [fileTab.active?.path]);

  return (
    <div className={s.diffEditor}>
      <DiffEditor
        theme={theme === 'dark' ? 'vs-theme-dark' : 'light'}
        height="100vh"
        language={fileTypeFromFileName(fileTab.active?.path ?? '')}
        original={diff.oldContent}
        modified={diff.latestContent}
        onMount={handleEditorDidMount}
        options={editorOptions}
      />
    </div>
  );
};

export default CodeDiffViewer;
