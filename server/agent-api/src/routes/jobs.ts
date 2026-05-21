import { Hono } from 'hono';
import { randomUUID } from 'crypto';

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface AgentJob {
  id: string;
  status: JobStatus;
  prompt: string;
  createdAt: number;
  updatedAt: number;
  log: string[];
  result?: Record<string, unknown>;
}

const jobs = new Map<string, AgentJob>();

export const jobRoutes = new Hono();

jobRoutes.post('/', async (c) => {
  const body = await c.req.json<{
    prompt: string;
    projectName?: string;
  }>();

  const id = randomUUID();
  const job: AgentJob = {
    id,
    status: 'queued',
    prompt: body.prompt,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    log: ['Job queued'],
  };
  jobs.set(id, job);

  setTimeout(() => {
    const j = jobs.get(id);
    if (!j) return;
    j.status = 'running';
    j.log.push('Worker: compile + test (cloud MVP stub)');
    j.updatedAt = Date.now();
    jobs.set(id, j);

    setTimeout(() => {
      const done = jobs.get(id);
      if (!done) return;
      done.status = 'completed';
      done.log.push(
        'Completed. Import suggested patches from IDE when cloud worker is fully wired.',
      );
      done.result = {
        summary: 'Cloud agent MVP — logs only. Full CI worker in follow-up.',
      };
      done.updatedAt = Date.now();
      jobs.set(id, done);
    }, 2000);
  }, 500);

  return c.json({ jobId: id, status: job.status });
});

jobRoutes.get('/:id', (c) => {
  const id = c.req.param('id');
  const job = jobs.get(id);
  if (!job) {
    return c.json({ error: 'Not found' }, 404);
  }
  return c.json(job);
});

jobRoutes.get('/', (c) => {
  return c.json({
    jobs: [...jobs.values()].sort((a, b) => b.createdAt - a.createdAt),
  });
});
