import { ThemeProvider } from '@/components/shared';
import { AppConfig } from '@/config/AppConfig';
import { IDEProvider } from '@/state/IDE.context';
import { THEME } from '@tonconnect/ui';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { WebContainer } from '@webcontainer/api';
import mixpanel from 'mixpanel-browser';
import { useEffect } from 'react';
import { RecoilRoot } from 'recoil';
import AppRoutes from './Routes';

mixpanel.init(AppConfig.analytics.MIXPANEL_TOKEN, {
  debug: false,
  track_pageview: AppConfig.analytics.IS_ENABLED,
  persistence: 'localStorage',
});

export default function App() {
  useEffect(() => {
    if (process.env.REACT_APP_DISABLE_WEBCONTAINER === 'true') return;

    (async () => {
      try {
        window.webcontainerInstance = await WebContainer.boot({
          coep: 'credentialless',
        });

        await window.webcontainerInstance.mount({
          'package.json': {
            file: {
              contents: `
                {
                  "name": "ton-web-ide-app",
                  "type": "module",
                  "dependencies": {
                    "jest": "29.6.2",
                    "@ton/core": "^0.56.3",
                    "@ton/test-utils": "0.4.2",
                    "@ton/sandbox": "^0.20.0"
                  }
                }`,
            },
          },
        });

        const installProcess = await window.webcontainerInstance.spawn('npm', [
          'install',
        ]);
        await installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              console.log('data', data);
            },
          }),
        );
        // Wait for install command to exit
        return installProcess.exit;
      } catch (error) {
        console.log('error', error);
      }
    })().catch(() => {});

    return () => {
      try {
        window.webcontainerInstance?.teardown();
        window.webcontainerInstance = null;
      } catch (error) {
        /* empty */
      }
    };
  }, []);

  return (
    <RecoilRoot>
      <IDEProvider>
        <ThemeProvider>
          <TonConnectUIProvider
            uiPreferences={{ theme: THEME.LIGHT }}
            manifestUrl="https://ide.ton.org/assets/ton/tonconnect-manifest.json"
          >
            <AppRoutes />
          </TonConnectUIProvider>
        </ThemeProvider>
      </IDEProvider>
    </RecoilRoot>
  );
}
