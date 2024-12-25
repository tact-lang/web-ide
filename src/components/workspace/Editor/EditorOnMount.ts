import { tactSnippets } from '@/assets/ton/tact/snippets';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

type Monaco = typeof monaco;

export const editorOnMount = async (monaco: Monaco) => {
  // monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
  //   // experimentalDecorators: false,
  // });

  // // Supress typescript import errors
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    diagnosticCodesToIgnore: [2307],
    noSemanticValidation: true,
    noSyntaxValidation: true,
  });

  const keywords = [
    'impure',
    'inline',
    'global',
    'return',
    'cell',
    'slice',
    'if',
    'while',
    'method_id',
  ];

  const globalMethods = ['get_data', 'set_data', 'begin_cell', 'throw'];

  const messageMethods = ['recv_internal', 'recv_external'];

  monaco.languages.registerCompletionItemProvider('tact', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      // Filter snippets based on the word starts with the snippet label
      const filteredSnippets = tactSnippets.filter((snippet) =>
        snippet.label.startsWith(word.word),
      );
      return {
        suggestions: filteredSnippets.map((snippet) => {
          return {
            label: snippet.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            insertText: snippet.code,
            documentation: snippet.description || '',
            detail: snippet.description || '',
            range,
          };
        }),
      };
    },
  });

  monaco.languages.registerCompletionItemProvider('func', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      const suggestions = [
        ...keywords.map((k) => {
          return {
            label: k,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: k,
            range,
          };
        }),
        ...globalMethods.map((k) => {
          return {
            label: k,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: k,
            range,
          };
        }),
        ...messageMethods.map((k) => {
          return {
            label: k,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: k,
            range,
          };
        }),
      ];

      return { suggestions: suggestions };
    },
    // triggerCharacters: ['/'],
  });

  const tonCore = await fetch('/assets/ton/types/ton-core.d.ts');
  const tonSanbox = await fetch('/assets/ton/types/ton-sandbox.d.ts');

  const tonCoreText = await tonCore.text();
  const tonSanboxText = await tonSanbox.text();

  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    tonCoreText,
    'file:///node_modules/@types/ton__core/index.d.ts',
  );
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    tonSanboxText,
    'file:///node_modules/@types/ton-community__sandbox/index.d.ts',
  );
};
