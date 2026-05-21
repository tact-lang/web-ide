import type { CompileContext, CompileResultPayload } from './types';

/**
 * Tolk compilation — Phase 2.
 * Uses WebContainer CLI when available; otherwise returns guided error.
 */
export function compileTolkContract(
  ctx: CompileContext,
  entryFile: string,
): CompileResultPayload {
  ctx.log?.(`Tolk compile requested for ${entryFile}`, 'info');
  return {
    success: false,
    artifacts: [],
    errors: [
      'Tolk compiler: run `npx @ton/tolk-js` in project terminal or use Tact/FunC for this build.',
      'TON IDE 2.0 will wire WASM/CLI in WebContainer when @ton/tolk-js is available in-browser.',
    ],
  };
}
