import { Layout, ThemeProvider } from '@/components/shared';
import { AppConfig } from '@/config/AppConfig';
import { IDEProvider } from '@/state/IDE.context';
import { WebContainerProvider } from '@/state/WebContainer.context';
import '@/styles/theme.scss';
import { THEME } from '@tonconnect/ui';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import mixpanel from 'mixpanel-browser';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { RecoilRoot } from 'recoil';

mixpanel.init(AppConfig.analytics.MIXPANEL_TOKEN, {
  debug: false,
  track_pageview: AppConfig.analytics.IS_ENABLED,
  persistence: 'localStorage',
});

export default function App({
  Component,
  pageProps: { ...pageProps },
}: AppProps) {
  return (
    <>
      <Head>
        <title>{AppConfig.seo.title}</title>
        <meta name="description" content="" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/image/svg+xml" href="/images/logo.svg" />
      </Head>
      <RecoilRoot>
        <IDEProvider>
          <ThemeProvider>
            <WebContainerProvider>
              <TonConnectUIProvider
                uiPreferences={{ theme: THEME.LIGHT }}
                manifestUrl="https://ide.ton.org/assets/ton/tonconnect-manifest.json"
              >
                <Layout>
                  <Component {...pageProps} />
                </Layout>
              </TonConnectUIProvider>
            </WebContainerProvider>
          </ThemeProvider>
        </IDEProvider>
      </RecoilRoot>
    </>
  );
}
