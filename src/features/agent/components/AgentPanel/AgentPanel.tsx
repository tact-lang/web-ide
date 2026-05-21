import { DEFAULT_AGENT_ID, TON_AGENTS, TON_MCP_SERVERS } from '../../config';
import type { AgentId, AgentMessage } from '../../types';
import { Button, Input, Select, Tag } from 'antd';
import { FC, useCallback, useState } from 'react';
import s from './AgentPanel.module.scss';

const { TextArea } = Input;

const WELCOME_MESSAGE: AgentMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'TON IDE 2.0 Agent — foundation build. Выберите агента и опишите задачу: jetton, AMM, контракт на FunC/Tact/Tolk. Подключение к AI Gateway и tool-calling — в следующей фазе.',
  createdAt: Date.now(),
  agentId: DEFAULT_AGENT_ID,
};

const statusColor: Record<string, string> = {
  available: 'green',
  planned: 'default',
  needs_auth: 'orange',
};

interface Props {
  projectPath?: string;
}

const AgentPanel: FC<Props> = ({ projectPath }) => {
  const [agentId, setAgentId] = useState<AgentId>(DEFAULT_AGENT_ID);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AgentMessage[]>([
    WELCOME_MESSAGE,
  ]);

  const selectedAgent = TON_AGENTS.find((a) => a.id === agentId)!;

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    const userMsg: AgentMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: Date.now(),
      agentId,
    };

    const placeholderReply: AgentMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: `[${selectedAgent.name}] Запрос принят. Runtime агента пока не подключён — настройте TON_IDE_AI_GATEWAY_URL для streaming и tools. Проект: ${projectPath ?? 'не открыт'}.`,
      createdAt: Date.now(),
      agentId,
    };

    setMessages((prev) => [...prev, userMsg, placeholderReply]);
    setInput('');
  }, [input, agentId, selectedAgent.name, projectPath]);

  return (
    <div className={s.root}>
      <div className={s.header}>
        <h3 className={s.title}>TON AI Agent</h3>
        <p className={s.subtitle}>{selectedAgent.description}</p>
        <Select
          size="small"
          value={agentId}
          onChange={(v) => setAgentId(v as AgentId)}
          options={TON_AGENTS.map((a) => ({
            value: a.id,
            label: a.name,
          }))}
          style={{ width: '100%' }}
        />
      </div>

      <div className={s.messages}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${s.message} ${
              msg.role === 'user' ? s.messageUser : s.messageAssistant
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>

      <div className={s.mcpSection}>
        <strong>MCP & tools</strong>
        <ul className={s.mcpList}>
          {TON_MCP_SERVERS.map((srv) => (
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
          onChange={(e) => setInput(e.target.value)}
          placeholder="Например: создай jetton с 3% fee на transfer и тестами в sandbox..."
          autoSize={{ minRows: 2, maxRows: 6 }}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button type="primary" size="small" onClick={handleSend}>
          Send
        </Button>
        <p className={s.hint}>
          Phase 0: UI + config. Phase 1: AI Gateway, file tools, compile/test
          loop.
        </p>
      </div>
    </div>
  );
};

export default AgentPanel;
