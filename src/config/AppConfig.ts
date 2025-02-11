export const AppConfig = {
  name: 'TON Web IDE',
  host: process.env.REACT_APP_PROJECT_HOST ?? 'ide.ton.org',
  seo: {
    title: 'TON Web IDE',
  },
  network: 'testnet',
  analytics: {
    MIXPANEL_TOKEN: process.env.REACT_APP_MIXPANEL_TOKEN ?? '',
    IS_ENABLED: !!process.env.REACT_APP_ANALYTICS_ENABLED || false,
  },
  proxy: {
    key: process.env.REACT_APP_PROXY_KEY ?? '',
    url: process.env.REACT_APP_PROXY_URL ?? 'https://proxy.cors.sh/',
  },
  cors: {
    proxy:
      process.env.REACT_APP_CORS_PROXY_URL ?? 'https://cors.isomorphic-git.org',
  },
  lspServer: process.env.REACT_APP_LSP_SERVER_URL ?? '',
};
