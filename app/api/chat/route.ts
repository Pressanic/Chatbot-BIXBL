import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { classifyIntent } from '@/lib/manager';
import { loadKnowledgeBase } from '@/lib/kb-loader';
import { AGENT_COLORS, AGENT_NAMES, MAX_HISTORY_MESSAGES } from '@/lib/agents';
import { COMPASS_PROMPT } from '@/prompts/compass';
import { ARCHITECT_PROMPT } from '@/prompts/architect';
import { BRIDGE_PROMPT } from '@/prompts/bridge';
import type { ChatMessage, AgentName } from '@/lib/types';

/**
 * maxDuration — Vercel serverless function timeout override.
 * Default free-tier timeout is 10s, which is too short for two sequential LLM calls.
 * 30s accommodates the Manager call + specialist agent call + streaming setup (Risk R3).
 */
export const maxDuration = 30;

interface RequestBody {
  message: string;
  history: ChatMessage[];
  current_agent: AgentName | null;
}

/**
 * extractMessageText — extracts plain text from a message object.
 * Handles both legacy format (content: string) and AI SDK v6 format (parts: TextPart[]).
 * Returns empty string if no text content is found.
 */
function extractMessageText(msg: {
  content?: unknown;
  parts?: Array<{ type: string; text?: string }>;
}): string {
  // AI SDK v6 format: extract text from parts array
  if (Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p) => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text as string)
      .join('');
  }
  // Legacy format: content is a plain string
  if (typeof msg.content === 'string') return msg.content;
  return '';
}

/**
 * validateRequestBody — parses the useChat request format { messages[], current_agent }.
 * Extracts the last user message as `message` and prior messages as `history`.
 * Handles AI SDK v6 UIMessage format (parts array) and legacy content string format.
 * Throws a descriptive Error on any validation failure; caller returns HTTP 400.
 * @param body - Raw parsed JSON from the request (unknown type)
 */
function validateRequestBody(body: unknown): RequestBody {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Request body must be a JSON object');
  }
  const b = body as Record<string, unknown>;

  // Guard: messages must be a non-empty array (sent by useChat)
  if (!Array.isArray(b.messages) || b.messages.length === 0) {
    throw new Error('messages must be a non-empty array');
  }
  const messages = b.messages as Array<{
    role: string;
    content?: unknown;
    parts?: Array<{ type: string; text?: string }>;
  }>;
  const lastMessage = messages[messages.length - 1];

  // Guard: last message must be a user message with content
  const lastContent = extractMessageText(lastMessage);
  if (!lastMessage || lastMessage.role !== 'user' || !lastContent.trim()) {
    throw new Error('last message must be a user message with non-empty content');
  }

  return {
    message: lastContent.trim(),
    history: messages.slice(0, -1).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: extractMessageText(m),
    })),
    current_agent: (b.current_agent as AgentName | null) ?? null,
  };
}

/**
 * getAgentPrompt — returns the system prompt string for a given agent.
 * Single source of truth for agent→prompt mapping. Never hardcode elsewhere.
 * @param agent - The active agent name
 */
function getAgentPrompt(agent: AgentName): string {
  const prompts: Record<AgentName, string> = {
    compass: COMPASS_PROMPT,
    architect: ARCHITECT_PROMPT,
    bridge: BRIDGE_PROMPT,
  };
  return prompts[agent];
}

/**
 * buildAgentContext — assembles the system prompt + KB into a single system string,
 * and formats the history as the messages array for the specialist LLM call.
 * @param systemPrompt - The agent's STARS system prompt
 * @param kb - The loaded shared + vertical KB content
 * @param history - Truncated conversation history including the latest user message
 */
function buildAgentContext(
  systemPrompt: string,
  kb: { shared: string; vertical: string },
  history: { role: 'user' | 'assistant'; content: string }[],
): { system: string; messages: { role: 'user' | 'assistant'; content: string }[] } {
  const system = [
    systemPrompt,
    '---',
    '## SHARED KNOWLEDGE BASE',
    kb.shared,
    '## VERTICAL KNOWLEDGE BASE',
    kb.vertical,
  ].join('\n\n');
  return { system, messages: history };
}

/**
 * POST /api/chat — main API route handler.
 *
 * Sprint 3: validates input → calls Manager → returns routing decision as JSON.
 * Sprint 4 will extend this to: load KB → call specialist agent → stream response.
 *
 * Risk R1 mitigation: history is truncated to MAX_HISTORY_MESSAGES before any LLM call.
 * Risk R5 mitigation: ANTHROPIC_API_KEY is accessed only server-side (via classifyIntent).
 */
export async function POST(request: NextRequest) {
  // Phase 1: validate input — return 400 on any validation failure
  let body: RequestBody;
  try {
    const raw: unknown = await request.json();
    body = validateRequestBody(raw);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }

  // Phase 2: classify intent and return routing decision
  try {
    // R1 mitigation: always truncate history before sending to any LLM
    const truncatedHistory = body.history.slice(-MAX_HISTORY_MESSAGES);
    console.log(`[route] History: ${body.history.length} → ${truncatedHistory.length} messages (R1 cap)`);

    // Manager call — classifyIntent never throws (returns compass fallback on failure)
    const decision = await classifyIntent(
      body.message,
      truncatedHistory,
      body.current_agent,
    );

    // Phase 3: Load KB and call specialist agent with streaming (GAP 1 mitigation: streamText)
    const [agentPrompt, kb] = await Promise.all([
      Promise.resolve(getAgentPrompt(decision.agent)),
      loadKnowledgeBase(decision.agent),
    ]);

    // Append the current user message to history for the specialist call
    const fullHistory: { role: 'user' | 'assistant'; content: string }[] = [
      ...truncatedHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: body.message },
    ];

    const { system, messages: agentMessages } = buildAgentContext(agentPrompt, kb, fullHistory);

    // Specialist agent streaming call — use Sonnet for quality responses
    const streamStart = Date.now();

    // R4 mitigation: if streaming fails, fall back to generateText and return full JSON
    try {
      const result = await streamText({
        model: createAnthropic()('claude-sonnet-4-5'),
        system,
        messages: agentMessages,
      });
      console.log(`[route] Stream started for ${decision.agent} in ${Date.now() - streamStart}ms`);
      // Note: toDataStreamResponse() was renamed to toUIMessageStreamResponse() in AI SDK v6
      const response = result.toUIMessageStreamResponse();
      response.headers.set('x-agent', decision.agent);
      response.headers.set('x-agent-color', AGENT_COLORS[decision.agent]);
      response.headers.set('x-agent-name', AGENT_NAMES[decision.agent]);
      return response;
    } catch (streamErr) {
      // Fallback: streaming failed — use generateText and return full response as JSON
      console.error('[route] streamText failed, using non-streaming fallback:', streamErr);
      const { generateText } = await import('ai');
      const { text } = await generateText({
        model: createAnthropic()('claude-sonnet-4-5'),
        system,
        messages: agentMessages,
      });
      return NextResponse.json(
        { text, agent: decision.agent },
        {
          headers: {
            'x-agent': decision.agent,
            'x-agent-color': AGENT_COLORS[decision.agent],
            'x-agent-name': AGENT_NAMES[decision.agent],
          },
        },
      );
    }

  } catch (err) {
    // This catch is for unexpected errors only — classifyIntent itself never throws
    console.error('[route] Unexpected error in POST /api/chat:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
