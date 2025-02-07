import { NetworkEnvironment } from '@/interfaces/workspace.interface';
import { delay as sleep, tonHttpEndpoint } from '@/utility/utils';
import { Network } from '@orbs-network/ton-access';
import { TonClient } from '@ton/ton';
import { CHAIN, useTonConnectUI } from '@tonconnect/ui-react';
import axios, {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { useEffect, useState } from 'react';

const httpAdapter: AxiosAdapter = async (
  config: InternalAxiosRequestConfig,
) => {
  let r: AxiosResponse;
  let attempts = 0;
  let delay = 500;
  let shouldRetry = true;

  while (shouldRetry) {
    r = await axios({
      ...config,
      adapter: undefined,
      headers: {
        ...config.headers,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      validateStatus: (status: number) =>
        (status >= 200 && status < 300) || status === 429,
    });
    if (r.status !== 429) {
      return r;
    }
    await sleep(delay);
    delay *= 2;
    attempts++;

    shouldRetry = attempts < 4;
  }
  throw new Error('Max attempts reached');
};

export const useTonClient = (
  network?: Exclude<NetworkEnvironment, 'SANDBOX'>,
) => {
  const [tonConnector] = useTonConnectUI();
  const [tonClient, setTonClient] = useState<TonClient | null>(null);

  const chain = network
    ? network.toLocaleLowerCase()
    : tonConnector.account?.chain === CHAIN.MAINNET
      ? 'mainnet'
      : 'testnet';

  useEffect(() => {
    if (!chain) return;

    const client = new TonClient({
      endpoint: tonHttpEndpoint({ network: chain as Network }),
      httpAdapter,
    });

    setTonClient(client);
  }, [chain]);

  return tonClient;
};
