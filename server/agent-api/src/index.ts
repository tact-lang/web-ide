import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { chatRoutes } from './routes/chat.js';
import { jobRoutes } from './routes/jobs.js';
import { mcpRoutes } from './routes/mcp.js';

const app = new Hono();

const allowedOrigins = (
  process.env.CORS_ORIGINS ??
  'http://localhost:3000,https://ide.ton.org'
).split(',');

app.use(
  '*',
  cors({
    origin: (origin) =>
      !origin || allowedOrigins.some((o) => origin.startsWith(o.trim()))
        ? origin ?? '*'
        : allowedOrigins[0],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.get('/health', (c) => c.json({ ok: true, service: 'ton-ide-agent-api' }));

app.route('/v1', chatRoutes);
app.route('/v1/mcp', mcpRoutes);
app.route('/v1/jobs', jobRoutes);

const port = Number(process.env.PORT ?? 8787);
console.log(`TON IDE Agent API listening on :${port}`);
serve({ fetch: app.fetch, port });
