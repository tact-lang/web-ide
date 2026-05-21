import { Hono } from 'hono';

export const mcpRoutes = new Hono();

const TON_API_BASE =
  process.env.TON_API_BASE_URL ?? 'https://tonapi.io/v2';
const TON_API_KEY = process.env.TON_API_KEY ?? '';

const DOCS_INDEX: { title: string; url: string; keywords: string[] }[] = [
  {
    title: 'Smart contracts overview',
    url: 'https://docs.ton.org/develop/smart-contracts/',
    keywords: ['contract', 'smart', 'tvm'],
  },
  {
    title: 'FunC language',
    url: 'https://docs.ton.org/develop/func/overview',
    keywords: ['func', 'fc', 'stdlib'],
  },
  {
    title: 'Tact language',
    url: 'https://docs.ton.org/develop/tact/overview',
    keywords: ['tact', 'blueprint'],
  },
  {
    title: 'Jettons TEP-74',
    url: 'https://github.com/ton-blockchain/TEPs/blob/master/text/0074-jettons-standard.md',
    keywords: ['jetton', 'tep-74', 'token'],
  },
  {
    title: 'Jetton wallets TEP-89',
    url: 'https://github.com/ton-blockchain/TEPs/blob/master/text/0089-jetton-wallet-standard.md',
    keywords: ['jetton', 'wallet', 'tep-89'],
  },
];

async function tonapiFetch(path: string) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (TON_API_KEY) {
    headers.Authorization = `Bearer ${TON_API_KEY}`;
  }
  const res = await fetch(`${TON_API_BASE}${path}`, { headers });
  if (!res.ok) {
    throw new Error(`TonAPI ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

mcpRoutes.post('/ton-api/account', async (c) => {
  const { address } = await c.req.json<{ address: string }>();
  try {
    const data = await tonapiFetch(
      `/accounts/${encodeURIComponent(address)}`,
    );
    return c.json({ ok: true, data });
  } catch (e) {
    return c.json({ ok: false, error: (e as Error).message }, 502);
  }
});

mcpRoutes.post('/ton-api/jetton', async (c) => {
  const { address } = await c.req.json<{ address: string }>();
  try {
    const data = await tonapiFetch(
      `/jettons/${encodeURIComponent(address)}`,
    );
    return c.json({ ok: true, data });
  } catch (e) {
    return c.json({ ok: false, error: (e as Error).message }, 502);
  }
});

mcpRoutes.post('/ton-docs/search', async (c) => {
  const { query } = await c.req.json<{ query: string }>();
  const q = query.toLowerCase();
  const hits = DOCS_INDEX.filter(
    (doc) =>
      doc.title.toLowerCase().includes(q) ||
      doc.keywords.some((k) => k.includes(q) || q.includes(k)),
  ).slice(0, 8);
  return c.json({ ok: true, results: hits });
});
