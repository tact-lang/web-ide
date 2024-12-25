import { AppConfig } from '@/config/AppConfig';
import { Alert } from 'antd';
import { FC } from 'react';

const NonProductionNotice: FC = () => {
  const isLocalhost = window.location.hostname === 'localhost';
  const isProductionURL = window.location.hostname === AppConfig.host;
  if (isLocalhost || isProductionURL) {
    return null;
  }

  return (
    <Alert
      message={
        <span>
          You are currently viewing a non-production environment. Visit the
          stable version at{' '}
          <a
            href={`https://${AppConfig.host}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {AppConfig.host}
          </a>
          .
        </span>
      }
      type="warning"
      showIcon
      closable
    />
  );
};

export default NonProductionNotice;
