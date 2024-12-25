export const AppConfig = {
  name: 'Nujan',
  seo: {
    title: 'Nujan IDE',
  },
  network: 'testnet',
  API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3000',
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
