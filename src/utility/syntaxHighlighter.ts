import { vscodeLight } from '@/assets/vscode-light';
import { vscodeOneDark } from '@/assets/vscode-one-dark';
import { ContractLanguage } from '@/interfaces/workspace.interface';
import { loader } from '@monaco-editor/react';
import { wireTmGrammars } from 'monaco-editor-textmate';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { Registry } from 'monaco-textmate';
import { loadWASM } from 'onigasm';
import funcTMLanguage from '../assets/ton/func/tmLanguage.json';
import tactTMLanguage from '../assets/ton/tact/tmLanguage.json';
import typeScriptTMLanguage from '../assets/typescript/tmLanguage.json';
type Monaco = typeof monaco;
type Loader = typeof loader;

let onigasmLoaded = false;

export async function highlightCodeSnippets(
  loader: Loader,
  _language: ContractLanguage,
): Promise<void> {
  const ftmLanguage = {
    func: funcTMLanguage,
    tact: tactTMLanguage,
    typescript: typeScriptTMLanguage,
  };

  if (!onigasmLoaded) {
    try {
      await loadWASM(
        'https://cdn.jsdelivr.net/npm/onigasm@2.2.5/lib/onigasm.wasm',
      );
      onigasmLoaded = true;
    } catch {
      /* empty */
    }
  }

  loader
    .init()
    .then((monaco: Monaco) => {
      for (const [key] of Object.entries(ftmLanguage)) {
        const language = key as ContractLanguage;
        const registry = new Registry({
          getGrammarDefinition: async () => {
            return {
              format: 'json',
              content: await ftmLanguage[language],
            };
          },
        });

        const grammars = new Map();
        grammars.set(language, `source.${language}`);
        monaco.languages.register({ id: language });

        const commentRules = {
          func: {
            lineComment: ';;',
            blockComment: ['{-', '-}'],
          },
          tact: {
            lineComment: '//',
            blockComment: ['/*', '*/'],
          },
        };

        const autoPairingRules = {
          func: {},
          tact: {
            surroundingPairs: [
              { open: '{', close: '}' },
              { open: '(', close: ')' },
              { open: '<', close: '>' },
              { open: '"', close: '"' },
            ],
            autoClosingPairs: [
              { open: '{', close: '}' },
              { open: '(', close: ')' },
              { open: '<', close: '>' },
              { open: '"', close: '"', notIn: ['string', 'comment'] },
            ],
          },
        };

        let languageConfiguration: monaco.languages.LanguageConfiguration = {
          comments: commentRules[language] as monaco.languages.CommentRule,
          indentationRules: {
            decreaseIndentPattern: /^\s*\}.*$/,
            increaseIndentPattern: /^.*\{[^}]*$/,
          },
        };

        if (language === 'tact') {
          languageConfiguration = {
            ...languageConfiguration,
            ...autoPairingRules.tact,
          };
        }

        monaco.languages.setLanguageConfiguration(
          language,
          languageConfiguration,
        );
        wireTmGrammars(monaco, registry, grammars).catch(() => {});
      }

      monaco.editor.defineTheme('vs-theme-dark', vscodeOneDark);
      monaco.editor.defineTheme('vs-theme-light', vscodeLight);
      monaco.editor.setTheme('vs-theme-dark');
    })
    .catch(() => {});
}
