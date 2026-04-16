# Sprint 4 Sub-Plan — Compass Agent + Streaming + Header-Driven Agent State

> **Scope:** This sprint extends the route from Sprint 3 (which returned routing JSON only)
> to a full streaming pipeline, and replaces the static ChatWindow with a live `useChat` interface.
> Tasks are in strict execution order. Each produces exactly one output.

---

### Task 4.1 — Update `validateRequestBody` in route.ts to accept the `useChat` message format

**Files involved:**
- `/app/api/chat/route.ts` (modify)

**Required input:**
- Sprint 3 complete (route.ts exists with the Sprint 3 `validateRequestBody`)

**Expected output:**
`validateRequestBody` now accepts `{ messages: Message[], current_agent }` (the format
sent by `useChat`) instead of `{ message, history, current_agent }`. It extracts the
last user message as `message` and everything before it as `history`. Replace the
existing `validateRequestBody` function and `RequestBody` interface with:

```ts
interface RequestBody {
  message: string;
  history: ChatMessage[];
  current_agent: AgentName | null;
}

/**
 * validateRequestBody — parses the useChat request format { messages[], current_agent }.
 * Extracts the last user message as `message` and prior messages as `history`.
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
  const messages = b.messages as { role: string; content: string }[];
  const lastMessage = messages[messages.length - 1];

  // Guard: last message must be a user message with content
  if (!lastMessage || lastMessage.role !== 'user' || !lastMessage.content?.trim()) {
    throw new Error('last message must be a user message with non-empty content');
  }

  return {
    message: lastMessage.content.trim(),
    history: messages.slice(0, -1) as ChatMessage[],
    current_agent: (b.current_agent as AgentName | null) ?? null,
  };
}
```

**Success criterion:**
```bash
npx tsc --noEmit
```
Zero errors. Then confirm the new validation rejects a missing `messages` field:
```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[],"current_agent":null}'
# Expected: 400

curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"ciao"}],"current_agent":null}'
# Expected: 200
```

---

### Task 4.2 — Add `getAgentPrompt` and `buildAgentContext` helper functions to route.ts

**Files involved:**
- `/app/api/chat/route.ts` (modify — add imports and two local helper functions)

**Required input:**
- Task 4.1 complete
- Sprint 2 complete (all prompt constants and `loadKnowledgeBase` exist)

**Expected output:**
route.ts gains three new imports and two new local functions. Add at the top of the file:

```ts
import { streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { loadKnowledgeBase } from '@/lib/kb-loader';
import { AGENT_COLORS, AGENT_NAMES } from '@/lib/agents';
import { COMPASS_PROMPT } from '@/prompts/compass';
import { ARCHITECT_PROMPT } from '@/prompts/architect';
import { BRIDGE_PROMPT } from '@/prompts/bridge';
```

Add these two local functions after `validateRequestBody`:

```ts
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
```

**Success criterion:**
```bash
npx tsc --noEmit
```
Zero errors. The existing `POST` handler still returns a 200 for a valid request
(Phase 3 is not yet connected — that is Task 4.3):
```bash
curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"ciao"}],"current_agent":null}' \
  | jq '.agent'
# Expected: "compass" (still returning Sprint 3 routing JSON)
```

---

### Task 4.3 — Replace the Phase 2 return in `POST` with the full Phase 3 streaming pipeline

**Files involved:**
- `/app/api/chat/route.ts` (modify — replace the final `return NextResponse.json` of Phase 2)

**Required input:**
- Task 4.2 complete (helpers exist, imports added)

**Expected output:**
The `POST` handler no longer returns `NextResponse.json({ agent, reason })` at the end
of Phase 2. Instead it continues into Phase 3: loads KB, builds context, calls `streamText`,
sets response headers, and returns the streaming response.

Replace the Sprint 3 final return line:
```ts
// REMOVE this line from Sprint 3:
return NextResponse.json({ agent: decision.agent, reason: decision.reason });
```

With Phase 3 (insert in its place within the existing `try` block):
```ts
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
    const result = await streamText({
      model: createAnthropic()('claude-3-5-sonnet-20241022'),
      system,
      messages: agentMessages,
    });

    console.log(`[route] Stream started for ${decision.agent} in ${Date.now() - streamStart}ms`);

    // GAP 2 mitigation: set agent identity in response headers so frontend can update badge
    const response = result.toDataStreamResponse();
    response.headers.set('x-agent', decision.agent);
    response.headers.set('x-agent-color', AGENT_COLORS[decision.agent]);
    response.headers.set('x-agent-name', AGENT_NAMES[decision.agent]);
    return response;
```

**Success criterion:**
```bash
npx tsc --noEmit
```
Zero errors. Then confirm the route now streams (not JSON):
```bash
curl -s -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"ciao ho unidea"}],"current_agent":null}'
```
The terminal must show streaming data chunks appearing progressively
(lines beginning with `0:"` in the Vercel AI SDK data stream format),
not a single JSON object. The `x-agent` header must be visible:
```bash
curl -s -I -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"ciao"}],"current_agent":null}' \
  | grep "x-agent"
# Expected: x-agent: compass
```

---

### Task 4.4 — Add a non-streaming fallback around the `streamText` call (R4 mitigation)

**Files involved:**
- `/app/api/chat/route.ts` (modify — wrap Phase 3 streaming in a try/catch with generateText fallback)

**Required input:**
- Task 4.3 complete (streaming works)

**Expected output:**
The `streamText` + `toDataStreamResponse()` block is wrapped in its own `try/catch`.
On any streaming error, `generateText` is called instead and the response with headers
is returned as JSON. Wrap the streaming section added in Task 4.3:

```ts
    // R4 mitigation: if streaming fails, fall back to generateText and return full JSON
    try {
      const result = await streamText({
        model: createAnthropic()('claude-3-5-sonnet-20241022'),
        system,
        messages: agentMessages,
      });
      console.log(`[route] Stream started for ${decision.agent} in ${Date.now() - streamStart}ms`);
      const response = result.toDataStreamResponse();
      response.headers.set('x-agent', decision.agent);
      response.headers.set('x-agent-color', AGENT_COLORS[decision.agent]);
      response.headers.set('x-agent-name', AGENT_NAMES[decision.agent]);
      return response;
    } catch (streamErr) {
      // Fallback: streaming failed — use generateText and return full response as JSON
      console.error('[route] streamText failed, using non-streaming fallback:', streamErr);
      const { generateText } = await import('ai');
      const { text } = await generateText({
        model: createAnthropic()('claude-3-5-sonnet-20241022'),
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
```

**Success criterion:**
```bash
npx tsc --noEmit
```
Zero errors. Normal operation is unchanged — streaming still works as verified in Task 4.3.
The fallback activates only if `streamText` itself throws, which does not happen in normal
operation. No additional test is required for the fallback path.

---

### Task 4.5 — Update `ChatInput` to accept and use dynamic props

**Files involved:**
- `/app/components/ChatInput.tsx` (modify — replace hardcoded props with dynamic ones)

**Required input:**
- Sprint 1 complete (`ChatInput` exists with `disabled: boolean` only)

**Expected output:**
`ChatInput` accepts four props: `disabled`, `value`, `onChange`, and `onSubmit`.
Replace the entire file content with:

```tsx
/**
 * ChatInput — text input and submit button for the chat interface.
 * @param disabled - True while a streaming response is in progress (driven by useChat isLoading)
 * @param value - Controlled input value from useChat
 * @param onChange - Input change handler from useChat
 * @param onSubmit - Form submit handler from useChat handleSubmit
 */
export function ChatInput({
  disabled,
  value,
  onChange,
  onSubmit,
}: {
  disabled: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex gap-3 p-4 border-t border-[#2a2a2a] bg-[#0f0f0f]"
    >
      <input
        type="text"
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={disabled ? 'Risposta in corso...' : 'Scrivi un messaggio...'}
        className="flex-1 px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-[#f0f0f0] text-sm placeholder:text-[#888] focus:outline-none focus:border-[#6475FA] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      />
      <button
        type="submit"
        disabled={disabled || value.trim() === ''}
        className="px-5 py-3 rounded-xl bg-[#6475FA] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#5060e0] transition-colors"
      >
        Invia
      </button>
    </form>
  );
}
```

**Success criterion:**
```bash
npx tsc --noEmit
```
Zero errors. `ChatInput` must not use `export default`.

---

### Task 4.6 — Rewrite `ChatWindow` as a client component with `useChat` and header-driven agent state

**Files involved:**
- `/app/components/ChatWindow.tsx` (overwrite — full replacement of the Sprint 1 static version)

**Required input:**
- Task 4.4 complete (route streams with headers)
- Task 4.5 complete (ChatInput accepts dynamic props)
- Tasks 2.1 and 2.2 complete (`AgentName`, `AGENT_COLORS`, `AGENT_NAMES` exist)

**Expected output:**
`ChatWindow` is a client component (`'use client'`). It uses `useChat` for message
management and streaming, `useState` for the active agent identity, and drives all
visual state from those two sources. Replace the entire file:

```tsx
'use client';

import { useState } from 'react';
import { useChat } from 'ai/react';
import { AgentIndicator } from './AgentIndicator';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { AGENT_COLORS, AGENT_NAMES } from '@/lib/agents';
import type { AgentName } from '@/lib/types';

interface ActiveAgent {
  agent: AgentName;
  color: string;
  name: string;
}

/** Default agent shown on load before any LLM response arrives. */
const DEFAULT_AGENT: ActiveAgent = {
  agent: 'compass',
  color: AGENT_COLORS.compass,
  name: AGENT_NAMES.compass,
};

/**
 * ChatWindow — main chat container. Client component.
 * Uses useChat for streaming and message history.
 * Agent identity is driven exclusively by x-agent response headers (GAP 2 mitigation).
 * History resets on page reload — no persistence (by design, per Anti-Goals).
 */
export function ChatWindow() {
  // GAP 2 mitigation: agent state is derived from headers, never hardcoded
  const [currentAgent, setCurrentAgent] = useState<ActiveAgent>(DEFAULT_AGENT);

  const { messages, input, handleSubmit, isLoading, setInput } = useChat({
    api: '/api/chat',
    // Passes current_agent to the route on every request
    body: { current_agent: currentAgent.agent },
    onResponse: (response) => {
      // Read x-agent headers and update badge before stream body is consumed
      const agent = response.headers.get('x-agent') as AgentName | null;
      const color = response.headers.get('x-agent-color');
      const name = response.headers.get('x-agent-name');
      if (agent && color && name) {
        setCurrentAgent({ agent, color, name });
      }
    },
    onError: (error) => {
      // Log streaming errors server-side context is in route.ts
      console.error('[ChatWindow] Stream error:', error);
    },
  });

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      {/* Header with dynamic agent badge */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a] bg-[#0f0f0f]">
        <h1 className="text-lg font-semibold text-[#f0f0f0]">BIXBG Chatbot</h1>
        <AgentIndicator agentName={currentAgent.name} agentColor={currentAgent.color} />
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Welcome message shown before any conversation starts */}
        {messages.length === 0 && (
          <MessageBubble
            role="assistant"
            content="Ciao Matteo. Dimmi dell'idea che hai in testa — anche se è ancora vaga, partiamo da lì."
            agentName={DEFAULT_AGENT.name}
            agentColor={DEFAULT_AGENT.color}
          />
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            role={msg.role as 'user' | 'assistant'}
            content={msg.content}
            agentName={msg.role === 'assistant' ? currentAgent.name : undefined}
            agentColor={msg.role === 'assistant' ? currentAgent.color : undefined}
          />
        ))}
      </div>

      {/* Input — isLoading from useChat drives the disabled state dynamically */}
      <ChatInput
        disabled={isLoading}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
```

**Success criterion:**
```bash
npx tsc --noEmit
```
Zero errors. Open `http://localhost:3000` — the page must load without console errors.
The welcome message must appear. The text input must be interactive (not hardcoded-disabled).

---

### Task 4.7 — Verify streaming appears in the browser Network tab (R4 mitigation)

**Files involved:**
- Browser DevTools — Network tab (observe only)

**Required input:**
- Task 4.6 complete (ChatWindow uses useChat)
- Dev server running

**Expected output:**
Confirmed proof that the response from `/api/chat` is a streaming response, not a
single bulk JSON payload.

**Success criterion:**
1. Open `http://localhost:3000` in Chrome or Firefox
2. Open DevTools → Network tab → check "Fetch/XHR"
3. Type a message (e.g., `"ho un'idea per una nuova esperienza"`) and press Invia
4. Click the `chat` request in the Network tab
5. In the **Headers** tab of that request, confirm:
   - `Content-Type` of the response is `text/event-stream` or contains `octet-stream`
6. In the **Response** tab or **EventStream** tab, confirm multiple rows of data
   appear progressively (not a single block)
7. In the browser chat UI, confirm the Compass response appears word-by-word
   (visible progressive rendering), not all at once

All seven points must pass. If the response appears all at once (no streaming), check
that `toDataStreamResponse()` is called correctly in route.ts and that `useChat` is
the frontend handler (not a plain `fetch`).

---

### Task 4.8 — Verify response headers `x-agent`, `x-agent-color`, `x-agent-name` are present (GAP 2 mitigation)

**Files involved:**
- Browser DevTools — Network tab (observe only)

**Required input:**
- Task 4.7 complete (streaming confirmed)

**Expected output:**
Confirmed that the three agent identity headers are set on every `/api/chat` response.

**Success criterion:**
With the Network tab still open from Task 4.7:
1. Click the `chat` network request
2. Go to the **Headers** tab → **Response Headers** section
3. Confirm these three headers are present with correct values:

| Header | Expected value |
|---|---|
| `x-agent` | `compass` |
| `x-agent-color` | `#6475FA` |
| `x-agent-name` | `BIXBG Compass` |

All three must be present. If any is missing, the header assignment in Task 4.3
was not applied correctly — check that `response.headers.set(...)` is called before
`return response` in route.ts.

---

### Task 4.9 — Verify the `AgentIndicator` badge is driven by headers, not hardcoded

**Files involved:**
- Browser UI (observe only)

**Required input:**
- Task 4.8 complete (headers confirmed)

**Expected output:**
Confirmed that the `AgentIndicator` badge reflects the `x-agent-name` and `x-agent-color`
values received in the response headers, and that this state lives in `useState`
(not in any hardcoded constant in the component).

**Success criterion:**
1. Reload `http://localhost:3000`
2. Confirm the badge shows "BIXBG Compass" in violet (`#6475FA`) — this is the default
3. Send a message and wait for the response to complete
4. Confirm the badge STILL shows "BIXBG Compass" in violet (routing is correctly staying
   on Compass for an initial message with no prior qualification context)
5. Open DevTools → React DevTools (if installed) or inspect the `<div>` wrapping the badge:
   the `style.backgroundColor` must be `rgb(100, 117, 250)` (the hex `#6475FA` in RGB)
6. Confirm the `style` attribute is applied inline (not a hardcoded Tailwind class like
   `bg-[#6475FA]`) — this proves the color comes from state, not from the component itself

---

### Task 4.10 — Verify ChatInput enables and disables dynamically based on streaming state

**Files involved:**
- Browser UI (observe only)

**Required input:**
- Task 4.9 complete (badge verified)

**Expected output:**
Confirmed that `ChatInput`'s textarea and button disable during streaming and re-enable
when streaming completes — driven by `isLoading` from `useChat`, not hardcoded.

**Success criterion:**
1. Open `http://localhost:3000`
2. Confirm: input field is **enabled** (you can click and type in it before sending)
3. Type a message and click Invia
4. While the response is streaming: confirm the input and button are both **disabled**
   (clicking the input does not focus it; the button is visually dimmed with `opacity-40`)
5. After the response finishes streaming: confirm the input and button are both
   **re-enabled** (you can type a new message immediately)
6. Confirm the input placeholder changes between `"Scrivi un messaggio..."` (enabled)
   and `"Risposta in corso..."` (disabled)

All six points must pass.

---

### Task 4.11 — Verify R1 history truncation is logged and R3 latency is within target

**Files involved:**
- Terminal running `npm run dev` (observe logs)

**Required input:**
- Task 4.10 complete (full UI interaction working)

**Expected output:**
Confirmed that the history truncation log and the Manager latency log appear in the
server terminal on every request.

**Success criterion:**
Send a message from the UI. In the `npm run dev` terminal, confirm these log lines appear:

```
[route] History: 0 → 0 messages (R1 cap)
[manager] Routing decision in Xms
[route] Stream started for compass in Xms
```

| Log line | Pass condition |
|---|---|
| `[route] History: N → M messages (R1 cap)` | Must appear on every request |
| `[manager] Routing decision in Xms` | X must be ≤ 2000ms |
| `[route] Stream started for compass in Xms` | Must appear; X is informational |

If the Manager latency exceeds 2000ms, verify the model in `classifyIntent` is
`claude-3-haiku-20240307` (fast routing model), not Sonnet.

---

### Task 4.12 — Verify Compass produces a precise qualifying question (end-to-end quality check)

**Files involved:**
- Browser UI (observe only)

**Required input:**
- Task 4.11 complete (all technical verifications passed)

**Expected output:**
Confirmed that the full pipeline — Manager routing, KB injection, Compass prompt, streaming —
produces a high-quality, on-brand response.

**Success criterion:**
Type this message in the UI: `"Ciao, ho un'idea per un'esperienza a Venezia"`

The Compass response must satisfy ALL of the following:
- Written entirely in **Italian**
- Asks **exactly one question** (not two or more in the same message)
- The question is specifically about **participants, theme, tension, or location** —
  NOT a generic "interesting! tell me more" response
- Does NOT contain the words: `Architect`, `Bridge`, `agente`, `trasferisco`, `collega`
  (the forbidden handoff language from the system prompt)
- Response appears **word-by-word** (streaming is active, not bulk)

If the response is in English: the Compass system prompt's language instruction
(`"Always respond in Italian"`) is not reaching the model — check `buildAgentContext`
is correctly prepending the system prompt.

---

## Sprint 4 — Completion Checklist

Before marking Sprint 4 as complete, confirm every item:

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `validateRequestBody` accepts `{ messages[], current_agent }` (useChat format)
- [ ] `getAgentPrompt` maps all three agent names to correct prompt constants
- [ ] `buildAgentContext` assembles system string with shared + vertical KB
- [ ] `streamText + toDataStreamResponse` is the streaming method (not StreamingTextResponse)
- [ ] `generateText` fallback exists in a `try/catch` around the streaming block
- [ ] `x-agent`, `x-agent-color`, `x-agent-name` headers are set before `return response`
- [ ] `ChatInput` props: `disabled`, `value`, `onChange`, `onSubmit` — no hardcoded state
- [ ] `ChatWindow` has `'use client'` directive at top
- [ ] `ChatWindow` uses `useChat` with `body: { current_agent }` and `onResponse` callback
- [ ] `currentAgent` state is initialized to Compass default and updated from headers only
- [ ] Network tab shows streaming response (not single JSON block) — Task 4.7 passed
- [ ] Network tab shows `x-agent: compass` response header — Task 4.8 passed
- [ ] Badge color is derived from `style={{ backgroundColor }}` state, not hardcoded class
- [ ] Input disables during streaming and re-enables on completion — Task 4.10 passed
- [ ] `[route] History: N → M messages (R1 cap)` log appears in terminal — Task 4.11 passed
- [ ] Compass responds in Italian with one precise qualifying question — Task 4.12 passed
- [ ] No file in `/app/components/` uses `export default`
- [ ] No frontend file references `ANTHROPIC_API_KEY`
