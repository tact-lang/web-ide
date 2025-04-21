import { Image } from '@/components/shared';
import { ConnectedWallet, useTonConnectUI } from '@tonconnect/ui-react';
import { Button } from 'antd';
import { FC, useEffect, useState } from 'react';
import s from './TonAuth.module.scss';

const TonAuth: FC = () => {
  const [tonConnector] = useTonConnectUI();
  const [isConnected, setIsConnected] = useState(false);

  const handleConnectWallet = async () => {
    try {
      if (isConnected) {
        await tonConnector.disconnect();
        setIsConnected(false);
        return;
      }
      await tonConnector.connectWallet();
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    setIsConnected(tonConnector.connected);

    return () => {};
  }, [tonConnector.connected]);

  useEffect(() => {
    tonConnector.onStatusChange((wallet: ConnectedWallet | null) => {
      if (!wallet || !tonConnector.connected) return;
      setIsConnected(Boolean(wallet) || tonConnector.connected);
    });
  }, []);

  return (
    <div className={s.root}>
      <Button
        className={s.btnAction}
        type="primary"
        onClick={() => {
          handleConnectWallet().catch(() => {});
        }}
      >
        <Image
          src={`/images/icon/ton-protocol-logo-white.svg`}
          width={30}
          height={30}
          alt={''}
          className={s.icon}
        />
        {isConnected ? 'Disconnect' : 'Connect'} Wallet
      </Button>
    </div>
  );
};

export default TonAuth;
