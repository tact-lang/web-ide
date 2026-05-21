import contractDeveloper from '../skills/contract-developer.md';
import defiArchitect from '../skills/defi-architect.md';
import frontendIntegrator from '../skills/frontend-integrator.md';
import jettonEngineer from '../skills/jetton-engineer.md';
import securityAuditor from '../skills/security-auditor.md';
import { getEnabledPlugins } from '@/features/plugins/registry';
import type { AgentId } from '../types';

const SKILL_MAP: Record<AgentId, string> = {
  'contract-developer': contractDeveloper,
  'jetton-engineer': jettonEngineer,
  'defi-architect': defiArchitect,
  'frontend-integrator': frontendIntegrator,
  'security-auditor': securityAuditor,
};

export function loadAgentSkill(agentId: AgentId): string {
  let skill = SKILL_MAP[agentId];
  const plugins = getEnabledPlugins();
  const extra = plugins
    .flatMap((p) => p.skills ?? [])
    .map((s) => `## Plugin: ${s.name}\n${s.content}`)
    .join('\n\n');
  if (extra) skill += `\n\n${extra}`;
  return skill;
}
