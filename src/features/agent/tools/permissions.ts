export type ToolPermission = 'read' | 'write' | 'chain';

export const TOOL_PERMISSIONS: Record<string, ToolPermission> = {
  read_project_files: 'read',
  read_abi: 'read',
  apply_patch: 'write',
  compile_contract: 'read',
  run_sandbox_tests: 'read',
  misti_analyze: 'read',
  deploy_contract: 'chain',
  fetch_jetton_metadata: 'read',
  simulate_swap: 'read',
  fetch_account_state: 'read',
  search_ton_docs: 'read',
};

export function getToolPermission(toolId: string): ToolPermission {
  return TOOL_PERMISSIONS[toolId] ?? 'read';
}

export function isToolAllowedForAgent(
  toolId: string,
  allowedTools: string[],
): boolean {
  return allowedTools.includes(toolId);
}
