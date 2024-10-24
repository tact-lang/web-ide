import { Layout, ThemeProvider } from '@/components/shared';
import { AppConfig } from '@/config/AppConfig';
import { IDEProvider } from '@/state/IDE.context';
import '@/styles/theme.scss';
import { THEME } from '@tonconnect/ui';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { WebContainer } from '@webcontainer/api';
import mixpanel from 'mixpanel-browser';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useEffect } from 'react';
import { RecoilRoot } from 'recoil';
import '../lib/polyfills';

mixpanel.init(AppConfig.analytics.MIXPANEL_TOKEN, {
  debug: false,
  track_pageview: AppConfig.analytics.IS_ENABLED,
  persistence: 'localStorage',
});

export default function App({
  Component,
  pageProps: { ...pageProps },
}: AppProps) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DISABLE_WEBCONTAINER) return;
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
                    "@ton/sandbox": "^0.15.0"
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
            <TonConnectUIProvider
              uiPreferences={{ theme: THEME.LIGHT }}
              manifestUrl="https://ide.ton.org/assets/ton/tonconnect-manifest.json"
            >
              <Layout>
                <Component {...pageProps} />
              </Layout>
            </TonConnectUIProvider>
          </ThemeProvider>
        </IDEProvider>
      </RecoilRoot>
    </>
  );
}
