import { createCloudJob, getCloudJob } from '../../runtime/agentClient';
import { Button, Input, List, Tag } from 'antd';
import { FC, useState } from 'react';

interface JobRow {
  id: string;
  status: string;
  prompt: string;
}

const CloudJobsPanel: FC = () => {
  const [prompt, setPrompt] = useState('');
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(false);

  const pollJob = async (id: string) => {
    const job = (await getCloudJob(id)) as {
      status: string;
      log?: string[];
    };
    setJobs((list) =>
      list.map((j) => (j.id === id ? { ...j, status: job.status } : j)),
    );
    if (job.status === 'queued' || job.status === 'running') {
      setTimeout(() => pollJob(id), 1500);
    }
  };

  const submit = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const { jobId, status } = await createCloudJob(prompt.trim());
      setJobs((j) => [
        { id: jobId, status, prompt: prompt.trim() },
        ...j,
      ]);
      setPrompt('');
      pollJob(jobId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 12, fontSize: 12 }}>
      <strong>Cloud agent jobs</strong>
      <Input.TextArea
        rows={2}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Long-running task, e.g. run all tests and audit"
        style={{ marginTop: 8 }}
      />
      <Button
        size="small"
        type="default"
        loading={loading}
        onClick={submit}
        style={{ marginTop: 8 }}
      >
        Start cloud job
      </Button>
      <List
        size="small"
        style={{ marginTop: 8 }}
        dataSource={jobs}
        renderItem={(j) => (
          <List.Item>
            <Tag>{j.status}</Tag>
            {j.prompt.slice(0, 60)}
          </List.Item>
        )}
      />
    </div>
  );
};

export default CloudJobsPanel;
