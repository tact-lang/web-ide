import { globalWorkspace } from '@/components/workspace/globalWorkspace';
import type { ContractLanguage } from '@/interfaces/workspace.interface';
import fileSystem from '@/lib/fs';
import { Blockchain } from '@ton/sandbox';
import type { DeployResult, DeploySandboxContext } from './types';

export async function ensureSandbox(): Promise<Blockchain> {
  if (globalWorkspace.sandboxBlockchain) {
    return globalWorkspace.sandboxBlockchain;
  }
  const blockchain = await Blockchain.create();
  globalWorkspace.sandboxBlockchain = blockchain;
  return blockchain;
}

/**
 * Phase 1: deploy validates artifacts exist and sandbox is ready.
 * Full UserContract deploy requires BuildProject state-init flow — use UI or extend with abiPath + init script.
 */
export async function deployContractSandbox(
  ctx: DeploySandboxContext,
): Promise<DeployResult> {
  const logs: string[] = [];
  try {
    const blockchain = ctx.blockchain;
    if (!globalWorkspace.sandboxWallet) {
      const wallet = await blockchain.treasury('agent');
      globalWorkspace.sandboxWallet = wallet;
    }

    const abiFull = ctx.abiPath.startsWith(ctx.projectPath)
      ? ctx.abiPath
      : `${ctx.projectPath}/${ctx.abiPath}`;
    const abiRaw = await fileSystem.readFile(abiFull);
    const abi = JSON.parse(abiRaw as string);
    logs.push(`ABI loaded: ${abi.name ?? 'contract'}`);
    logs.push(`Sandbox ready. Language: ${ctx.language as ContractLanguage}`);
    logs.push(
      'Use Build & Deploy panel for full state-init deploy, or pass compiled wrapper .ts in a follow-up tool version.',
    );

    return {
      success: true,
      address: globalWorkspace.sandboxWallet.address.toString(),
      logs,
      errors: [],
    };
  } catch (error) {
    return {
      success: false,
      logs,
      errors: [(error as Error).message],
    };
  }
}
