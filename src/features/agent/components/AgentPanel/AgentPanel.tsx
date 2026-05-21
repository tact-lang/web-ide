import { DEFAULT_AGENT_ID, TON_AGENTS, TON_MCP_SERVERS } from '../../config';
import type { AgentId } from '../../types';
import { useAgentChat } from '../../runtime/useAgentChat';
import type { UseAgentChatOptions } from '../../runtime/useAgentChat';
import { PatchApproveModal } from '../PatchApproveModal';
import CloudJobsPanel from '../CloudJobsPanel/CloudJobsPanel';
import { Button, Input, Select, Tag, Spin } from 'antd';
import { FC, useState } from 'react';
import s from './AgentPanel.module.scss';
const { TextArea } = Input;

interface Props extends UseAgentChatOptions {
  projectPath?: string;
}

const statusColor: Record<string, string> = {
  available: 'green',
  planned: 'default',
  needs_auth: 'orange',
};

const AgentPanel: FC<Props> = ({
  projectPath,
  project,
  projectFiles,
  openFiles,
  webcontainer,
  sandbox,
  compileOptions,
  compileFunc,
  compileTs,
  getFile,
  onLog,
}) => {
  const [agentId, setAgentId] = useState<AgentId>(DEFAULT_AGENT_ID);
  const [input, setInput] = useState('');

  const {
    messages,
    isRunning,
    sendMessage,
    stop,
    pendingPatch,
    resolvePatch,
  } = useAgentChat({
    agentId,
    project: project ?? null,
    projectFiles,
    openFiles,
    webcontainer,
    sandbox,
    compileOptions,
    compileFunc,
    compileTs,
    getFile,
    onLog,
  });

  const selectedAgent = TON_AGENTS.find((a) => a.id === agentId)!;

  const mcpWithStatus = TON_MCP_SERVERS.map((srv) => ({
    ...srv,
    status:
      srv.id === 'ton-api' || srv.id === 'ton-docs'
        ? ('available' as const)
        : srv.status,
  }));

  return (
    <div className={s.root}>
      <PatchApproveModal patch={pendingPatch} onResolve={resolvePatch} />
      <div className={s.header}>
        <h3 className={s.title}>TON AI Agent</h3>
        <p className={s.subtitle}>{selectedAgent.description}</p>
        <Select
          size="small"
          value={agentId}
          onChange={(v) => { setAgentId(v as AgentId); }}
          options={TON_AGENTS.map((a) => ({
            value: a.id,
            label: a.name,
          }))}
          style={{ width: '100%' }}
          disabled={isRunning}
        />
      </div>

      <div className={s.messages}>
        {messages.length === 0 && (
          <div className={`${s.message} ${s.messageAssistant}`}>
            TON IDE 2.0 — опишите задачу: jetton, AMM, контракт FunC/Tact/Tolk.
            Tools: compile, test, read/write files (с подтверждением), Misti,
            MCP ton-api/docs.
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id}>
            <div
              className={`${s.message} ${
                msg.role === 'user' ? s.messageUser : s.messageAssistant
              }`}
            >
              {msg.content}
            </div>
            {msg.toolCalls?.map((tc) => (
              <div key={tc.id} className={s.toolCall}>
                <Tag>{tc.name}</Tag>
                <Tag
                  color={
                    tc.status === 'done'
                      ? 'green'
                      : tc.status === 'error'
                        ? 'red'
                        : 'processing'
                  }
                >
                  {tc.status}
                </Tag>
                {tc.result && (
                  <pre className={s.toolResult}>{tc.result.slice(0, 500)}</pre>
                )}
              </div>
            ))}
          </div>
        ))}
        {isRunning && <Spin size="small" />}
      </div>

      <div className={s.mcpSection}>
        <strong>MCP & tools</strong>
        <ul className={s.mcpList}>
          {mcpWithStatus.map((srv) => (
            <li key={srv.id} className={s.mcpItem}>
              {srv.name}
              <Tag
                className={s.statusTag}
                color={statusColor[srv.status]}
                bordered={false}
              >
                {srv.status}
              </Tag>
            </li>
          ))}
        </ul>
      </div>

      <div className={s.inputRow}>
        <TextArea
          value={input}
          onChange={(e) => { setInput(e.target.value); }}
          placeholder="Например: прочитай main.tact, добавь getter и запусти тесты..."
          autoSize={{ minRows: 2, maxRows: 6 }}
          disabled={isRunning || !projectPath}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              sendMessage(input);
              setInput('');
            }
          }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            type="primary"
            size="small"
            disabled={isRunning || !projectPath}
            onClick={() => {
              sendMessage(input);
              setInput('');
            }}
          >
            Send
          </Button>
          {isRunning && (
            <Button size="small" onClick={stop}>
              Stop
            </Button>
          )}
        </div>
        <p className={s.hint}>
          Agent API: /api/agent — локально `cd server/agent-api && npm run dev`
        </p>
        <CloudJobsPanel />
      </div>
    </div>
  );
};

export default AgentPanel;
