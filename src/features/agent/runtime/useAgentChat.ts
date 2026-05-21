import { useCallback, useRef, useState } from 'react';
import { TON_AGENTS } from '../config';
import { buildAgentContext } from '../context/buildContext';
import type { AgentId } from '../types';
import { postAgentChat } from './agentClient';
import { loadAgentSkill } from './loadSkill';
import type { AgentUiMessage, ChatMessage } from './types';
import { getToolSchemasForAgent, executeTool } from '../tools/registry';
import type { ToolExecutionContext } from './toolContext';
import type { PendingPatch } from '@/services/projectFs';
import type { Tree } from '@/interfaces/workspace.interface';
import type { Project } from '@/interfaces/workspace.interface';
import type { WebContainer } from '@webcontainer/api';
import type { AgentProjectContext } from '@/services/types';

const MAX_TOOL_ITERATIONS = 8;

export interface UseAgentChatOptions {
  agentId: AgentId;
  project: Project | null;
  projectFiles: Tree[];
  openFiles: string[];
  webcontainer: WebContainer | null;
  sandbox: import('@ton/sandbox').Blockchain | null;
  compileOptions: ToolExecutionContext['compileOptions'];
  compileFunc: ToolExecutionContext['compileFunc'];
  compileTs: ToolExecutionContext['compileTs'];
  getFile: ToolExecutionContext['getFile'];
  onLog?: (msg: string, level?: 'info' | 'error' | 'success') => void;
}

export function useAgentChat(options: UseAgentChatOptions) {
  const [messages, setMessages] = useState<AgentUiMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [pendingPatch, setPendingPatch] = useState<PendingPatch | null>(null);
  const patchResolver = useRef<((v: boolean) => void) | null>(null);
  const [agentContext, setAgentContext] = useState<AgentProjectContext | null>(
    null,
  );
  const abortRef = useRef<AbortController | null>(null);

  const agentDef = TON_AGENTS.find((a) => a.id === options.agentId)!;

  const resolvePatch = useCallback((approved: boolean) => {
    patchResolver.current?.(approved);
    patchResolver.current = null;
    setPendingPatch(null);
  }, []);

  const waitForPatchApproval = useCallback((patch: PendingPatch) => {
    setPendingPatch(patch);
    return new Promise<boolean>((resolve) => {
      patchResolver.current = resolve;
    });
  }, []);

  const buildToolContext = useCallback(
    (): ToolExecutionContext | null => {
      if (!options.project?.path) return null;
      const lang = options.project.language ?? 'tact';
      return {
        agentId: options.agentId,
        projectPath: options.project.path,
        language: lang === 'func' ? 'func' : lang === 'tolk' ? 'tolk' : 'tact',
        projectFiles: options.projectFiles,
        agentContext: agentContext ?? { project: null, openFiles: [], fileTree: [] },
        log: (msg, level) => options.onLog?.(msg, level),
        webcontainer: options.webcontainer,
        sandbox: options.sandbox,
        compileOptions: options.compileOptions,
        compileFunc: options.compileFunc,
        compileTs: options.compileTs,
        getFile: options.getFile,
        onPendingPatch: waitForPatchApproval,
        updateAgentContext: (partial) =>
          setAgentContext((prev) => ({ ...(prev ?? {}), ...partial } as AgentProjectContext)),
      };
    },
    [options, agentContext, waitForPatchApproval],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isRunning) return;
      if (!options.project?.path) {
        options.onLog?.('Open a project first', 'error');
        return;
      }

      const userMsg: AgentUiMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: text.trim(),
        createdAt: Date.now(),
      };
      setMessages((m) => [...m, userMsg]);
      setIsRunning(true);
      abortRef.current = new AbortController();

      try {
        const ctx = await buildAgentContext({
          project: options.project,
          openFiles: options.openFiles,
          lastCompile: agentContext?.lastCompile,
          lastTestRun: agentContext?.lastTestRun,
        });
        setAgentContext(ctx);

        const chatHistory: ChatMessage[] = [
          ...messages.map((m) => ({
            role: m.role as ChatMessage['role'],
            content: m.content,
          })),
          { role: 'user', content: text.trim() },
        ];

        const tools = getToolSchemasForAgent(agentDef.tools);
        let iteration = 0;
        let loopMessages = [...chatHistory];

        while (iteration < MAX_TOOL_ITERATIONS) {
          iteration++;
          const response = await postAgentChat(
            {
              messages: loopMessages,
              tools,
              skill: loadAgentSkill(options.agentId),
              context: ctx as unknown as Record<string, unknown>,
            },
            abortRef.current.signal,
          );

          const assistantMsg: AgentUiMessage = {
            id: `a-${Date.now()}-${iteration}`,
            role: 'assistant',
            content: response.message.content,
            toolCalls: response.message.toolCalls?.map((tc) => ({
              id: tc.id,
              name: tc.name,
              status: 'pending' as const,
            })),
            createdAt: Date.now(),
          };
          setMessages((m) => [...m, assistantMsg]);

          const toolCalls = response.message.toolCalls ?? [];
          if (toolCalls.length === 0 || response.finishReason === 'stop') {
            break;
          }

          const toolCtx = buildToolContext();
          if (!toolCtx) break;

          if (toolCalls.length > 0) {
            loopMessages.push({
              role: 'assistant',
              content: response.message.content || '',
            });
          }

          for (const tc of toolCalls) {
            const result = await executeTool(
              toolCtx,
              tc.id,
              tc.name,
              tc.arguments,
            );
            const resultStr = JSON.stringify(
              result.error ? { error: result.error } : result.result,
              null,
              2,
            );
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantMsg.id
                  ? {
                      ...msg,
                      toolCalls: msg.toolCalls?.map((t) =>
                        t.id === tc.id
                          ? {
                              ...t,
                              status: result.error ? 'error' : 'done',
                              result: resultStr.slice(0, 2000),
                            }
                          : t,
                      ),
                    }
                  : msg,
              ),
            );
            loopMessages.push({
              role: 'tool',
              tool_call_id: tc.id,
              name: tc.name,
              content: resultStr,
            });
          }
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setMessages((m) => [
            ...m,
            {
              id: `err-${Date.now()}`,
              role: 'assistant',
              content: `Error: ${(error as Error).message}. Ensure agent-api is running (npm run dev in server/agent-api) and REACT_APP_AGENT_API_URL is set.`,
              createdAt: Date.now(),
            },
          ]);
        }
      } finally {
        setIsRunning(false);
        abortRef.current = null;
      }
    },
    [
      isRunning,
      options,
      messages,
      agentDef.tools,
      agentContext,
      buildToolContext,
    ],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsRunning(false);
  }, []);

  return {
    messages,
    isRunning,
    sendMessage,
    stop,
    pendingPatch,
    resolvePatch,
  };
}
