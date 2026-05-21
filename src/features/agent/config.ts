import type { AgentDefinition, McpServerDefinition } from './types';

export const TON_AGENTS: AgentDefinition[] = [
  {
    id: 'contract-developer',
    name: 'Contract Developer',
    description:
      'FunC, Tolk, Tact — storage, messages, opcodes, compile & sandbox tests.',
    skillPath: 'contract-developer.md',
    tools: [
      'read_project_files',
      'apply_patch',
      'compile_contract',
      'run_sandbox_tests',
      'deploy_contract',
    ],
  },
  {
    id: 'jetton-engineer',
    name: 'Jetton Engineer',
    description:
      'TEP-74/89 jettons — minter, wallet, metadata, custom transfer logic.',
    skillPath: 'jetton-engineer.md',
    tools: [
      'read_project_files',
      'apply_patch',
      'compile_contract',
      'run_sandbox_tests',
      'fetch_jetton_metadata',
    ],
  },
  {
    id: 'defi-architect',
    name: 'DeFi Architect',
    description: 'AMM DEX, pools, LP tokens, swaps, routing, fee models.',
    skillPath: 'defi-architect.md',
    tools: [
      'read_project_files',
      'apply_patch',
      'compile_contract',
      'run_sandbox_tests',
      'simulate_swap',
    ],
  },
  {
    id: 'frontend-integrator',
    name: 'Frontend Integrator',
    description: 'TonConnect, @ton/core, dApp flows for your contracts.',
    skillPath: 'frontend-integrator.md',
    tools: ['read_project_files', 'apply_patch', 'read_abi'],
  },
  {
    id: 'security-auditor',
    name: 'Security Auditor',
    description: 'Misti, gas/storage limits, access control, bounce handling.',
    skillPath: 'security-auditor.md',
    tools: ['read_project_files', 'misti_analyze', 'run_sandbox_tests'],
  },
];

export const TON_MCP_SERVERS: McpServerDefinition[] = [
  {
    id: 'ton-api',
    name: 'TON API',
    description: 'Account state, transactions, jetton metadata (TonAPI / Toncenter).',
    status: 'planned',
  },
  {
    id: 'ton-docs',
    name: 'TON Docs',
    description: 'Search docs.ton.org, TEPs, and official cookbooks.',
    status: 'planned',
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    description: 'Project scaffold, networks, deploy scripts.',
    status: 'planned',
  },
  {
    id: 'github-ton',
    name: 'TON GitHub',
    description: 'Reference implementations: jettons, DEX, standards.',
    status: 'planned',
  },
  {
    id: 'wallet',
    name: 'TonConnect',
    description: 'Sign messages and deployments (user-approved).',
    status: 'needs_auth',
  },
];

export const DEFAULT_AGENT_ID = TON_AGENTS[0].id;
