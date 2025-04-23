/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */

const NODE_ENVIRONMENT = process.env.NODE_ENV;

const MIXPANEL_TOKEN =
  process.env.REACT_APP_MIXPANEL_TOKEN?.trim() ||
  '279a0a925b2c3388797950019c3733b4';

export const AppConfig = {
  name: 'TON Web IDE',
  host: process.env.REACT_APP_PROJECT_HOST || 'ide.ton.org',
  seo: {
    title: 'TON Web IDE',
  },
  network: 'testnet',
  analytics: {
    MIXPANEL_TOKEN,
    IS_ENABLED:
      (NODE_ENVIRONMENT === 'production' ||
        process.env.REACT_APP_ANALYTICS_ENABLED?.toLowerCase() === 'true') &&
      MIXPANEL_TOKEN !== 'unknown',
  },
  proxy: {
    GIT_RAW_CONTENT: 'https://cdn-ide-raw.tonstudio.io',
    GIT_IMPORT: 'https://cdn-ide-codeload.tonstudio.io',
  },
  cors: {
    proxy:
      process.env.REACT_APP_CORS_PROXY_URL || 'https://cors.isomorphic-git.org',
  },
  lspServer: process.env.REACT_APP_LSP_SERVER_URL || '',
};
