import type { AgentName } from './types';

/**
 * MAX_HISTORY_MESSAGES — hard cap on conversation history sent to any LLM call.
 * Prevents context window overflow (Risk R1). Used by the API route to truncate
 * history before every Manager or specialist agent call.
 */
export const MAX_HISTORY_MESSAGES = 20;

/**
 * AGENT_COLORS — maps each agent identifier to its brand hex color.
 * Source of truth for all UI badge colors. Never hardcode these values elsewhere.
 */
export const AGENT_COLORS: Record<AgentName, string> = {
  compass: '#6475FA',
  architect: '#E8650A',
  bridge: '#22C55E',
};

/**
 * AGENT_NAMES — maps each agent identifier to its display name shown in the UI badge.
 * Never hardcode agent display names in components — always reference this map.
 */
export const AGENT_NAMES: Record<AgentName, string> = {
  compass: 'BIXBG Compass',
  architect: 'BIXBG Architect',
  bridge: 'BIXBG Bridge',
};
