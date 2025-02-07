export type Compiler = 'func' | 'tact';

export interface FuncCompileSettings {
  funcVersion: string;
  commandLine: string;
}

export interface TactCompileSettings {
  tactVersion: string;
}

interface ISource {
  includeInCommand: boolean;
  isEntrypoint: boolean;
  isStdLib: boolean;
  hasIncludeDirectives: boolean;
  folder: string;
}

export type VerifierSource = {
  compiler: Compiler;
  compilerSettings: FuncCompileSettings | TactCompileSettings;
  knownContractAddress: string;
  knownContractHash: string;
  sources: ISource[];
  senderAddress: string;
};
