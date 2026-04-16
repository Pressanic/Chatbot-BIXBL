import { generateObject, jsonSchema } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { MANAGER_PROMPT } from '../prompts/manager-prompt';
import type { AgentName, RoutingDecision, ChatMessage } from './types';

// WARNING: this file is server-side only. Never import it from a client component.

/** The three valid agent values the Manager can return. Used for runtime validation. */
const VALID_AGENTS: AgentName[] = ['compass', 'architect', 'bridge'];

/**
 * Routing schema — enforces structured output via Anthropic tool calling.
 * generateObject with jsonSchema bypasses text parsing entirely: the model
 * is forced to return a validated object, eliminating JSON extraction issues.
 */
const routingSchema = jsonSchema<{ agent: string; reason: string }>({
  type: 'object',
  properties: {
    agent: { type: 'string', enum: ['compass', 'architect', 'bridge'] },
    reason: { type: 'string' },
  },
  required: ['agent', 'reason'],
});

/**
 * classifyIntent — calls the Manager LLM and returns a validated routing decision.
 *
 * Uses generateObject (Anthropic tool calling) instead of generateText + JSON parsing
 * to guarantee structured output regardless of model verbosity.
 *
 * Risk R2 mitigation: output is validated against VALID_AGENTS before use.
 * Risk R3 mitigation: response time is logged on every call.
 * Risk R1 mitigation: any failure returns a compass fallback — UX never breaks.
 *
 * @param message - The user's latest message text
 * @param history - Truncated conversation history (already capped to MAX_HISTORY_MESSAGES)
 * @param currentAgent - The currently active agent, or null for the first message
 * @returns A validated RoutingDecision, or compass fallback on any failure
 */
export async function classifyIntent(
  message: string,
  history: ChatMessage[],
  currentAgent: AgentName | null,
): Promise<RoutingDecision> {
  const startTime = Date.now();

  try {
    const { object } = await generateObject({
      model: anthropic('claude-haiku-4-5-20251001'),
      schema: routingSchema,
      system: MANAGER_PROMPT,
      messages: [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        {
          role: 'user' as const,
          content: JSON.stringify({ message, current_agent: currentAgent }),
        },
      ],
    });

    const elapsed = Date.now() - startTime;
    console.log(`[manager] Routing decision in ${elapsed}ms`);

    // R2 mitigation: validate agent value even though the schema constrains it
    if (!VALID_AGENTS.includes(object.agent as AgentName)) {
      console.warn(`[manager] Unexpected agent "${object.agent}" → fallback: compass`);
      return { agent: 'compass', reason: 'fallback: unexpected agent value' };
    }

    console.log(`[manager] Route → ${object.agent} | reason: ${object.reason}`);
    return { agent: object.agent as AgentName, reason: object.reason };

  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error(`[manager] Error → fallback: compass | after ${elapsed}ms`, err);
    return { agent: 'compass', reason: 'fallback: manager call failed' };
  }
}
