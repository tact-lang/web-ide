declare module 'monaco-vim' {
  export function initVimMode(
    editor: monaco.editor.IStandaloneCodeEditor,
    statusBar: HTMLElement,
    options?: { keyHandler?: Record<string, unknown>; override?: boolean },
  ): { dispose: () => void };
}
