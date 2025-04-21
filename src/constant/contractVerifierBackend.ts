import { NetworkEnvironment } from '@/interfaces/workspace.interface';
import { Address } from '@ton/core';

export const contractVerifierBackend: Record<
  Exclude<NetworkEnvironment, 'SANDBOX'>,
  {
    sourceRegistry: Address;
    backends: string[];
    id: string;
  }
> = {
  MAINNET: {
    sourceRegistry: Address.parse(
      'EQD-BJSVUJviud_Qv7Ymfd3qzXdrmV525e3YDzWQoHIAiInL',
    ),
    backends: [
      'https://ton-source-prod-1.herokuapp.com',
      'https://ton-source-prod-2.herokuapp.com',
      'https://ton-source-prod-3.herokuapp.com',
    ],
    id: 'orbs.com',
  },
  TESTNET: {
    sourceRegistry: Address.parse(
      'EQCsdKYwUaXkgJkz2l0ol6qT_WxeRbE_wBCwnEybmR0u5TO8',
    ),
    backends: ['https://ton-source-prod-testnet-1.herokuapp.com'],
    id: 'orbs-testnet',
  },
};
