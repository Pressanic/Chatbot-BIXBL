/**
 * AgentName — the three valid specialist agent identifiers.
 * These are the only values the Manager can return and the only
 * values that can be passed to loadKnowledgeBase or any agent call.
 */
export type AgentName = 'compass' | 'architect' | 'bridge';

/**
 * RoutingDecision — the structured JSON output produced by the Manager Agent.
 * Used to validate the result of JSON.parse() before acting on it.
 */
export interface RoutingDecision {
  agent: AgentName;
  reason: string;
}

/**
 * ChatMessage — a single turn in the conversation history.
 * Passed to every LLM call after truncation to MAX_HISTORY_MESSAGES.
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  agent?: AgentName;
}
