import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { MANAGER_PROMPT } from '../prompts/manager-prompt';
import type { AgentName, RoutingDecision, ChatMessage } from './types';

// WARNING: this file is server-side only. Never import it from a client component.

/** The three valid agent values the Manager can return. Used for runtime validation. */
const VALID_AGENTS: AgentName[] = ['compass', 'architect', 'bridge'];

/**
 * classifyIntent — calls the Manager LLM and returns a validated routing decision.
 *
 * Risk R2 mitigation: output is validated against VALID_AGENTS before use.
 * Risk R3 mitigation: response time is logged to the console on every call.
 * Risk RISK1 mitigation: any failure (parse error, network, invalid value) returns
 *   a compass fallback instead of throwing — the UX never breaks.
 * Risk RISK3 mitigation: JSON.parse result is validated before casting to RoutingDecision.
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
  // Guard: entire function is wrapped — any uncaught error returns compass fallback
  const startTime = Date.now();

  try {
    // Manager call — use Flash Lite for fast, low-cost routing
    const { text } = await generateText({
      model: anthropic('claude-haiku-4.5-20251001'),
      system: MANAGER_PROMPT,
      messages: [
        // Map history: strip the 'agent' metadata field, keep only role + content
        ...history.map((m) => ({ role: m.role, content: m.content })),
        {
          role: 'user' as const,
          content: JSON.stringify({ message, current_agent: currentAgent }),
        },
      ],
    });

    const elapsed = Date.now() - startTime;
    // R3 mitigation: log latency on every call — target is under 2000ms
    console.log(`[manager] Routing decision in ${elapsed}ms`);

    // Strip markdown code fences if the model wraps JSON in ```json ... ```
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    // RISK 3 mitigation: validate shape before casting — JSON.parse returns any
    const parsed: unknown = JSON.parse(cleaned);

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'agent' in parsed &&
      typeof (parsed as Record<string, unknown>).agent === 'string' &&
      VALID_AGENTS.includes((parsed as Record<string, unknown>).agent as AgentName)
    ) {
      // R2 mitigation: log every routing decision with reason for debugging
      console.log(`[manager] Route → ${(parsed as RoutingDecision).agent} | reason: ${(parsed as RoutingDecision).reason}`);
      return parsed as RoutingDecision;
    }

    // Invalid shape — log and fall back (RISK 1 + RISK 3 mitigation)
    console.warn('[manager] Invalid shape → fallback: compass | reason: invalid output shape');
    return { agent: 'compass', reason: 'fallback: invalid manager output shape' };

  } catch (err) {
    const elapsed = Date.now() - startTime;
    // RISK 1 mitigation: never propagate — always return a usable fallback
    console.error(`[manager] Error → fallback: compass | after ${elapsed}ms`);
    return { agent: 'compass', reason: 'fallback: manager call or parse failed' };
  }
}
