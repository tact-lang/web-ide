import { ThemeProvider } from '@/components/shared';
import { AppConfig } from '@/config/AppConfig';
import { IDEProvider } from '@/state/IDE.context';
import { THEME } from '@tonconnect/ui';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import mixpanel from 'mixpanel-browser';
import { RecoilRoot } from 'recoil';
import AppRoutes from './Routes';
import { WebContainerProvider } from './state/WebContainer.context';

mixpanel.init(AppConfig.analytics.MIXPANEL_TOKEN, {
  debug: false,
  track_pageview: AppConfig.analytics.IS_ENABLED,
  persistence: 'localStorage',
});

export default function App() {
  return (
    <RecoilRoot>
      <IDEProvider>
        <ThemeProvider>
          <WebContainerProvider>
            <TonConnectUIProvider
              uiPreferences={{ theme: THEME.LIGHT }}
              manifestUrl="https://ide.ton.org/assets/ton/tonconnect-manifest.json"
            >
              <AppRoutes />
            </TonConnectUIProvider>
          </WebContainerProvider>
        </ThemeProvider>
      </IDEProvider>
    </RecoilRoot>
  );
}
