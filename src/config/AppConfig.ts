export const AppConfig = {
  name: 'TON Web IDE',
  host: process.env.NEXT_PUBLIC_PROJECT_HOST ?? 'ide.ton.org',
  seo: {
    title: 'TON Web IDE',
  },
  network: 'testnet',
  analytics: {
    MIXPANEL_TOKEN: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN ?? '',
    IS_ENABLED: !!process.env.NEXT_PUBLIC_ANALYTICS_ENABLED || false,
  },
  proxy: {
    key: process.env.NEXT_PUBLIC_PROXY_KEY ?? '',
    url: process.env.NEXT_PUBLIC_PROXY_URL ?? 'https://proxy.cors.sh/',
  },
  cors: {
    proxy:
      process.env.NEXT_PUBLIC_CORS_PROXY_URL ??
      'https://cors.isomorphic-git.org',
  },
  lspServer: process.env.NEXT_PUBLIC_LSP_SERVER_URL ?? '',
};
