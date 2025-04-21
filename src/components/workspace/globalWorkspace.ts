import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';

export interface WalletDetails {
  key: string;
  address: string;
}

interface GlobalWorkspace {
  sandboxBlockchain: Blockchain | null;
  sandboxWallet: SandboxContract<TreasuryContract> | null;
  getDebugLogs: () => string[];
  wallets?: WalletDetails[];
  connectedWallet?: WalletDetails;
}

export const globalWorkspace: GlobalWorkspace = {
  sandboxBlockchain: null,
  sandboxWallet: null,
  connectedWallet: undefined,
  wallets: [],
  getDebugLogs: () => {
    if (!globalWorkspace.sandboxBlockchain) {
      return [];
    }
    const blockchain = globalWorkspace.sandboxBlockchain as Blockchain;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (blockchain.executor as any).debugLogs ?? [];
  },
};
