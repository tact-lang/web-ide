import { useSettingAction } from '@/hooks/setting.hooks';
import { Tree } from '@/interfaces/workspace.interface';
import { configureMonacoEditor } from '@/utility/editor';
import EventEmitter from '@/utility/eventEmitter';
import { delay, fileTypeFromFileName } from '@/utility/utils';
import EditorDefault, { OnChange } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { FC, useEffect, useRef, useState } from 'react';
// import { useLatest } from 'react-use';
import { useTheme } from '@/components/shared/ThemeProvider';
import { useFile, useFileTab } from '@/hooks';
import { useProject } from '@/hooks/projectV2.hooks';
import { useLatest } from 'react-use';
import ReconnectingWebSocket from 'reconnecting-websocket';
import s from './Editor.module.scss';
import { editorOnMount } from './EditorOnMount';
import { editorOptions } from './shared';
type Monaco = typeof monaco;

interface Props {
  className?: string;
}

const Editor: FC<Props> = ({ className = '' }) => {
  const { activeProject } = useProject();
  const { getFile, saveFile: storeFileContent } = useFile();
  const { fileTab } = useFileTab();
  const { theme } = useTheme();

  const { isFormatOnSave, getSettingStateByKey } = useSettingAction();

  const [isLoaded, setIsLoaded] = useState(false);
  const [isEditorInitialized, setIsEditorInitialized] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<[number, number]>([
    0, 0,
  ]);
  const editorMode = getSettingStateByKey('editorMode');

  const latestFile = useLatest(fileTab.active);

  const [initialFile, setInitialFile] = useState<Pick<
    Tree,
    'id' | 'content'
  > | null>(null);

  const autoSaveTimeoutRef = useRef<number | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const vimStatusBarRef = useRef<HTMLElement | null>(null);
  const vimModeRef = useRef<{
    dispose: () => void;
  } | null>(null);

  // eslint-disable-next-line prefer-const
  let lspWebSocket: ReconnectingWebSocket | null;

  const saveFile = async (value?: string) => {
    if (!editorRef.current) return;

    const fileContent = value ?? editorRef.current.getValue();
    if (!fileContent || !fileTab.active) return;
    try {
      if (isFormatOnSave()) {
        editorRef.current.trigger('editor', 'editor.action.formatDocument', {});
        await delay(200);
      }
      await storeFileContent(fileTab.active.path, fileContent);
      EventEmitter.emit('FILE_SAVED', { filePath: fileTab.active.path });
    } catch (error) {
      /* empty */
    }
  };

  useEffect(() => {
    if (!fileTab.active) return;

    configureMonacoEditor(fileTab.active.path)
      .then(() => {
        setIsLoaded(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    // If file is changed e.g. in case of build process then force update in editor
    EventEmitter.on('FORCE_UPDATE_FILE', (file) => {
      if (
        !activeProject?.path ||
        (latestFile.current?.path.includes('setting.json') &&
          typeof file == 'string')
      )
        return;

      (async () => {
        const filePath = typeof file === 'string' ? file : file.newPath;
        if (filePath !== latestFile.current?.path) return;
        await fetchFileContent(true);
      })().catch((error) => {
        console.error('Error handling FORCE_UPDATE_FILE event:', error);
      });
    });
    return () => {
      EventEmitter.off('FORCE_UPDATE_FILE');
    };
  }, [isLoaded]);

  const fetchFileContent = async (force = false) => {
    if (!fileTab.active) return;
    if (
      (!fileTab.active.path || fileTab.active.path === initialFile?.id) &&
      !force
    )
      return;
    let content = (await getFile(fileTab.active.path)) as string;
    if (!editorRef.current) return;
    let modelContent = editorRef.current.getValue();

    if (force) {
      editorRef.current.setValue(content);
      modelContent = content;
    }
    if (modelContent) {
      content = modelContent;
    } else {
      editorRef.current.setValue(content);
    }
    setInitialFile({ id: fileTab.active.path, content });
    editorRef.current.focus();
  };

  const handleEditorChange: OnChange = (value) => {
    if (!editorRef.current) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = window.setTimeout(() => saveFile(value), 1000);
  };

  const initializeEditorMode = async () => {
    if (!editorRef.current || !vimStatusBarRef.current) return;

    if (editorMode === 'vim') {
      const { initVimMode } = await import('monaco-vim');
      vimModeRef.current = initVimMode(
        editorRef.current,
        vimStatusBarRef.current as unknown as HTMLElement,
      );
    } else {
      vimModeRef.current?.dispose();
    }
  };

  useEffect(() => {
    if (editorRef.current) {
      initializeEditorMode().catch(() => {});
    }
    return () => {
      vimModeRef.current?.dispose();
    };
  }, [editorMode]);

  useEffect(() => {
    if (!isEditorInitialized) {
      return;
    }
    (async () => {
      await fetchFileContent();
    })().catch(() => {});
  }, [fileTab.active, isEditorInitialized]);

  useEffect(() => {
    if (!monacoRef.current) {
      return;
    }
  }, [monacoRef.current]);

  useEffect(() => {
    window.onbeforeunload = () => {
      // On page reload/exit, close web socket connection
      lspWebSocket?.close();
    };
    return () => {
      vimModeRef.current?.dispose();
      lspWebSocket?.close();
    };
  }, []);

  if (!isLoaded) {
    return <div className={`${s.container} ${className}`}>Loading...</div>;
  }

  return (
    <div className={`${s.container} ${className}`}>
      <div className={s.editorInfo}>
        <div>
          <span className={s.vimStatuBar} ref={vimStatusBarRef} />
        </div>
        <span>
          Ln {cursorPosition[0]}, Col {cursorPosition[1]}
        </span>
      </div>
      <EditorDefault
        className={s.editor}
        path={fileTab.active?.path ?? ''}
        theme={theme === 'dark' ? 'vs-theme-dark' : 'vs-theme-light'}
        // height="90vh"
        defaultLanguage={fileTypeFromFileName(fileTab.active?.path ?? '')}
        defaultValue={undefined}
        onChange={handleEditorChange}
        options={editorOptions}
        onMount={(editor, monaco) => {
          (async () => {
            editorRef.current = editor;
            monacoRef.current = monaco;

            setIsEditorInitialized(true);
            await editorOnMount(monaco);
            await initializeEditorMode();
            editor.onDidChangeCursorPosition(() => {
              const position = editor.getPosition();
              if (position) {
                setCursorPosition([position.lineNumber, position.column]);
              }
            });
            const { startLSP } = await import('./lsp');
            await startLSP(editor, monaco, lspWebSocket);
          })().catch((error) => {
            console.error('Error in onMount:', error);
          });
        }}
      />
    </div>
  );
};

export default Editor;
