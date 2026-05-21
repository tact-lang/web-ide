import {
  compileContract,
  deployContractSandbox,
  ensureSandbox,
  listProjectFiles,
  preparePatch,
  applyPatch,
  readProjectFiles,
  runMistiAnalysis,
  runSandboxTests,
} from '@/services';
import fileSystem from '@/lib/fs';
import { z } from 'zod';
import { getAgentApiBase } from '../runtime/agentClient';
import type { ToolDefinition } from './types';
import type { ToolExecutionContext } from '../runtime/toolContext';

const readProjectFilesTool: ToolDefinition = {
  id: 'read_project_files',
  description: 'Read file contents from the project by relative paths or list tree',
  parameters: z.object({
    paths: z.array(z.string()).optional(),
    listOnly: z.boolean().optional(),
  }),
  async execute(ctx, args) {
    if (args.listOnly) {
      const files = await listProjectFiles(ctx.projectPath);
      return { files: files.map((f) => f.path) };
    }
    const paths = args.paths ?? [];
    const content = await readProjectFiles(
      { projectPath: ctx.projectPath, log: ctx.log },
      paths.map((p) => p.replace(/^\//, '')),
    );
    return { files: content };
  },
};

const applyPatchTool: ToolDefinition = {
  id: 'apply_patch',
  description: 'Write or replace a file (requires user approval in UI)',
  parameters: z.object({
    path: z.string(),
    content: z.string(),
  }),
  async execute(ctx, args) {
    const patch = await preparePatch(
      { projectPath: ctx.projectPath, log: ctx.log },
      args.path,
      args.content,
    );
    if (ctx.onPendingPatch) {
      const approved = await ctx.onPendingPatch(patch);
      if (!approved) {
        return { applied: false, reason: 'User rejected patch' };
      }
    }
    await applyPatch({ projectPath: ctx.projectPath, log: ctx.log }, patch);
    return { applied: true, path: args.path };
  },
};

const compileContractTool: ToolDefinition = {
  id: 'compile_contract',
  description: 'Compile FunC, Tact, or Tolk entry file',
  parameters: z.object({
    entryFile: z.string(),
    language: z.enum(['func', 'tact', 'tolk']).optional(),
  }),
  async execute(ctx, args) {
    const language = args.language ?? ctx.language;
    const result = await compileContract(
      {
        projectPath: ctx.projectPath,
        language,
        projectFiles: ctx.projectFiles,
        log: ctx.log,
        ...ctx.compileOptions,
      },
      args.entryFile,
    );
    ctx.updateAgentContext?.({ lastCompile: result });
    return { ...result };
  },
};

const runSandboxTestsTool: ToolDefinition = {
  id: 'run_sandbox_tests',
  description: 'Run Jest sandbox test for a .spec.ts file via WebContainer',
  parameters: z.object({
    specFile: z.string(),
  }),
  async execute(ctx, args) {
    if (!ctx.webcontainer) {
      return {
        success: false,
        error: 'WebContainer not loaded. Open Test panel first or wait for init.',
      };
    }
    const result = await runSandboxTests({
      projectPath: ctx.projectPath,
      specFile: args.specFile,
      webcontainer: ctx.webcontainer,
      compileFunc: ctx.compileFunc,
      compileTs: ctx.compileTs,
      getFile: ctx.getFile,
      log: ctx.log,
    });
    ctx.updateAgentContext?.({ lastTestRun: result });
    return { ...result };
  },
};

const deployContractTool: ToolDefinition = {
  id: 'deploy_contract',
  description: 'Prepare SANDBOX deploy (validates ABI and sandbox wallet)',
  parameters: z.object({
    abiPath: z.string(),
    environment: z.enum(['SANDBOX']).default('SANDBOX'),
    tonValue: z.string().optional(),
  }),
  async execute(ctx, args) {
    if (args.environment !== 'SANDBOX') {
      return { success: false, errors: ['Only SANDBOX allowed from agent'] };
    }
    const blockchain = ctx.sandbox ?? (await ensureSandbox());
    const result = await deployContractSandbox({
      projectPath: ctx.projectPath,
      language: ctx.language,
      abiPath: args.abiPath,
      blockchain,
      tonValue: args.tonValue,
      log: ctx.log,
    });
    return { ...result };
  },
};

const readAbiTool: ToolDefinition = {
  id: 'read_abi',
  description: 'Read parsed ABI JSON from dist/',
  parameters: z.object({
    abiPath: z.string(),
  }),
  async execute(ctx, args) {
    const full = args.abiPath.startsWith(ctx.projectPath)
      ? args.abiPath
      : `${ctx.projectPath}/${args.abiPath}`;
    const raw = await fileSystem.readFile(full);
    return { abi: JSON.parse(raw as string) };
  },
};

const mistiAnalyzeTool: ToolDefinition = {
  id: 'misti_analyze',
  description: 'Run Misti static analyzer on a Tact file',
  parameters: z.object({
    tactFile: z.string(),
  }),
  async execute(ctx, args) {
    const result = await runMistiAnalysis({
      projectPath: ctx.projectPath,
      projectFiles: ctx.projectFiles,
      selectedPath: args.tactFile,
      log: ctx.log,
    });
    return { ...result };
  },
};

const fetchJettonMetadataTool: ToolDefinition = {
  id: 'fetch_jetton_metadata',
  description: 'Fetch jetton metadata via MCP ton-api proxy',
  parameters: z.object({
    address: z.string(),
  }),
  async execute(_ctx, args) {
    const base = getAgentApiBase();
    try {
      const res = await fetch(`${base}/v1/mcp/ton-api/jetton`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: args.address }),
      });
      if (!res.ok) {
        return { error: await res.text() };
      }
      return await res.json();
    } catch (e) {
      return { error: (e as Error).message, hint: 'Configure agent-api and TON_API_KEY' };
    }
  },
};

const simulateSwapTool: ToolDefinition = {
  id: 'simulate_swap',
  description: 'Hint to run AMM template sandbox tests',
  parameters: z.object({
    specFile: z.string().optional(),
  }),
  async execute(ctx, args) {
    const spec = args.specFile ?? 'tests/amm.spec.ts';
    if (!ctx.webcontainer) {
      return { success: false, message: 'WebContainer required', specFile: spec };
    }
    return runSandboxTestsTool.execute(ctx, { specFile: spec });
  },
};

const fetchAccountStateTool: ToolDefinition = {
  id: 'fetch_account_state',
  description: 'Fetch account state via ton-api MCP',
  parameters: z.object({
    address: z.string(),
  }),
  async execute(_ctx, args) {
    const base = getAgentApiBase();
    try {
      const res = await fetch(`${base}/v1/mcp/ton-api/account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: args.address }),
      });
      return res.ok ? await res.json() : { error: await res.text() };
    } catch (e) {
      return { error: (e as Error).message };
    }
  },
};

const searchTonDocsTool: ToolDefinition = {
  id: 'search_ton_docs',
  description: 'Search TON documentation index',
  parameters: z.object({
    query: z.string(),
  }),
  async execute(_ctx, args) {
    const base = getAgentApiBase();
    try {
      const res = await fetch(`${base}/v1/mcp/ton-docs/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: args.query }),
      });
      return res.ok ? await res.json() : { error: await res.text() };
    } catch (e) {
      return { error: (e as Error).message };
    }
  },
};

export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  read_project_files: readProjectFilesTool,
  apply_patch: applyPatchTool,
  compile_contract: compileContractTool,
  run_sandbox_tests: runSandboxTestsTool,
  deploy_contract: deployContractTool,
  read_abi: readAbiTool,
  misti_analyze: mistiAnalyzeTool,
  fetch_jetton_metadata: fetchJettonMetadataTool,
  simulate_swap: simulateSwapTool,
  fetch_account_state: fetchAccountStateTool,
  search_ton_docs: searchTonDocsTool,
};

export async function executeTool(
  ctx: ToolExecutionContext,
  toolCallId: string,
  name: string,
  args: Record<string, unknown>,
) {
  if (!(name in TOOL_REGISTRY)) {
    return {
      toolCallId,
      name,
      result: {},
      error: `Unknown tool: ${name}`,
    };
  }
  const tool = TOOL_REGISTRY[name];
  try {
    const parsed = tool.parameters.parse(args);
    const result = await tool.execute(ctx, parsed);
    return { toolCallId, name, result };
  } catch (error) {
    return {
      toolCallId,
      name,
      result: {},
      error: (error as Error).message,
    };
  }
}

export function getToolSchemasForAgent(allowedTools: string[]) {
  return allowedTools
    .filter((id): id is keyof typeof TOOL_REGISTRY => id in TOOL_REGISTRY)
    .map((id) => {
      const t = TOOL_REGISTRY[id];
      return {
        type: 'function' as const,
        function: {
          name: id,
          description: t.description,
          parameters: zodToJsonSchema(t.parameters),
        },
      };
    });
}

function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, val] of Object.entries(shape)) {
      properties[key] = zodFieldToJson(val as z.ZodTypeAny);
      if (!(val instanceof z.ZodOptional)) {
        required.push(key);
      }
    }
    return {
      type: 'object',
      properties,
      required: required.length ? required : undefined,
    };
  }
  return { type: 'object', properties: {} };
}

function zodFieldToJson(field: z.ZodTypeAny): Record<string, unknown> {
  if (field instanceof z.ZodString) return { type: 'string' };
  if (field instanceof z.ZodBoolean) return { type: 'boolean' };
  if (field instanceof z.ZodArray) return { type: 'array', items: { type: 'string' } };
  if (field instanceof z.ZodEnum) return { type: 'string', enum: field.options };
  if (field instanceof z.ZodOptional) return zodFieldToJson(field.unwrap());
  if (field instanceof z.ZodDefault) return zodFieldToJson(field.removeDefault());
  return { type: 'string' };
}
