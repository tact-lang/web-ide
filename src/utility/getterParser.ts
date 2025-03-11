import Parser from 'web-tree-sitter';
import TreeSitterWasm from 'web-tree-sitter/tree-sitter.wasm';
import { isWebAssemblySupported } from './utils';

let language: Parser.Language | null = null;

export const initParser = async (langUri: string) => {
  if (language) {
    return;
  }
  const options = {
    locateFile: () => TreeSitterWasm,
  };
  await Parser.init(options);
  language = await Parser.Language.load(langUri);
  return language;
};

export const createParser = (parserLanguage: Parser.Language | null = null) => {
  const parser = new Parser();
  parser.setLanguage(parserLanguage ?? language);
  parser.setTimeoutMicros(1000 * 1000);
  return parser;
};

type GetterParameter = {
  type: string;
  name: string;
};

export type Getter = {
  returnTypes: string[];
  name: string;
  parameters: GetterParameter[];
};

export async function parseGetters(code: string): Promise<Getter[]> {
  if (!isWebAssemblySupported()) {
    return [];
  }

  await initParser('/assets/ton/tree-sitter-func.wasm');
  const p = createParser();
  const parsed = p.parse(code);

  const getters = parsed.rootNode.children.filter(
    (c) =>
      c.type === 'function_definition' &&
      c.children
        .find((n) => n.type === 'specifiers_list')
        ?.text.includes('method_id'),
  );

  const gettersParsed = getters.map((f) => {
    const returnTypes = f.children[0].children
      .filter((c) => !c.type.match(/[,()]/)) // TODO types are slice, primitive_type, ",", "(", ")"
      .map((c) => c.text);

    const name = f.children.find((n) => n.type === 'function_name')!.text;

    const parameters = f.children
      .find((n) => n.type === 'parameter_list')!
      .children.filter((c) => c.type === 'parameter_declaration')
      .map((c) => ({
        type: c.child(0)!.text,
        name: c.child(1)!.text,
      }));

    return {
      returnTypes,
      name,
      parameters,
    };
  });

  return gettersParsed;
}

export async function extractCompilerDiretive(code: string): Promise<string[]> {
  if (!isWebAssemblySupported()) {
    return [];
  }

  await initParser('/assets/ton/tree-sitter-func.wasm');
  const p = createParser();
  const parsed = p.parse(code);

  const directives = parsed.rootNode.children
    .filter((c) => c.type === 'compiler_directive')
    .map((c) => {
      return c.children[0].children[2].text.replace(/["']/g, '');
    });

  return directives;
}
