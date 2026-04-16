# BIXBG Chatbot — Development Master Plan (v2 — Post-Validation)

> **How to read this document:** Sprints are ordered by technical dependency. Each sprint must be
> fully complete and verified before the next begins. Every sprint produces something you can
> open, see, or test. No sprint is purely infrastructural.
> Estimated total build time: ~4 hours (university lesson format).
>
> **v2 changes:** This plan incorporates feedback from an independent technical review.
> See the **Post-Validation Changelog** at the bottom for the full decision log.

---

## Sprint 1 — Project Scaffold + Directory Structure + Static Chat UI

**Objective:** A Next.js project exists, is running locally, with the exact directory structure
defined in the IDE Rules already in place, and displays a static (hardcoded) chat interface
with the correct visual identity for all three agents.

**Verifiable Output:**
- `npm run dev` runs without errors
- The following directories and files exist at the project root (create empty placeholder files
  if needed — content comes in Sprint 2):
  ```
  /knowledge-base/   (directory)
  /lib/              (directory)
  /prompts/          (directory)
  /app/components/   (directory)
  next.config.js     (with outputFileTracingIncludes — see below)
  .env.local         (with ANTHROPIC_API_KEY placeholder)
  .gitignore         (confirms .env.local is listed)
  ```
- `next.config.js` contains this exact configuration to ensure `.md` KB files are included
  in the Vercel serverless bundle:
  ```js
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    experimental: {
      outputFileTracingIncludes: {
        '/api/chat': ['./knowledge-base/**/*.md'],
      },
    },
  };
  module.exports = nextConfig;
  ```
- Opening `http://localhost:3000` shows a chat window with:
  - At least one hardcoded message bubble from "BIXBG Compass" in violet (`#6475FA`)
  - The agent name + color badge visible in the UI (`AgentIndicator` component)
  - A visible text input field and a **hardcoded-disabled** send button
    *(note: the button is always disabled in this sprint as a placeholder — dynamic
    disable/enable based on streaming state is implemented in Sprint 4)*
- `git status` confirms `.env.local` is **untracked**

**Note on default exports:** `page.tsx` and `layout.tsx` use `export default` as required
by the Next.js App Router framework. This is the only exception to the no-default-export
rule. All other files in this project use named exports exclusively.

**Dependencies:** None.

**Specific Risks:**
- **R5 (API key exposed):** Create `.env.local` and verify `.gitignore` in this sprint —
  before any code touches the API key. Run `git status` to confirm `.env.local` is untracked.
  This locks the security pattern in place from the first commit.
- **RISK 2 (KB files missing from Vercel bundle — new):** `next.config.js` with
  `outputFileTracingIncludes` is created in this sprint. The `/knowledge-base/` path is
  registered immediately, before the actual `.md` files exist, so Sprint 2 simply populates
  a directory already known to the bundler.

**Complexity Estimate:** LOW

---

## Sprint 2 — Types + Agent Config + Knowledge Base + System Prompts

**Objective:** All shared TypeScript types, agent constants, Knowledge Base `.md` files,
and system prompt exports exist and are verifiably correct — forming the complete static
content layer of the application.

**Verifiable Output:**

**Step 1 — `/lib/types.ts`** (create first, all other files depend on it):
  ```ts
  export type AgentName = 'compass' | 'architect' | 'bridge';

  export interface RoutingDecision {
    agent: AgentName;
    reason: string;
  }

  export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    agent?: AgentName;
  }
  ```
  Confirm: TypeScript compiler accepts this file with zero errors (`npx tsc --noEmit`).

**Step 2 — `/lib/agents.ts`**:
  - Exports `MAX_HISTORY_MESSAGES = 20` (used by the API route to cap history)
  - Exports `AGENT_COLORS: Record<AgentName, string>` with the correct hex values:
    `compass: '#6475FA'`, `architect: '#E8650A'`, `bridge: '#22C55E'`
  - Exports `AGENT_NAMES: Record<AgentName, string>` with display names:
    `compass: 'BIXBG Compass'`, `architect: 'BIXBG Architect'`, `bridge: 'BIXBG Bridge'`

**Step 3 — `/knowledge-base/`**: `shared.md`, `compass.md`, `architect.md`, `bridge.md`
  all exist with real content (copied from the source documents in this repo).

**Step 4 — `/lib/kb-loader.ts`**: exports `loadKnowledgeBase(agent: AgentName)` using
  `path.join(process.cwd(), 'knowledge-base', ...)` — the only correct path for Vercel
  runtime compatibility.

  Verify by running a temporary test script:
  ```bash
  node -e "const {loadKnowledgeBase} = require('./lib/kb-loader'); \
  loadKnowledgeBase('compass').then(r => { \
    console.assert(r.shared.includes('Belle idee'), 'shared KB missing'); \
    console.assert(r.vertical.includes('Compass'), 'compass KB missing'); \
    console.log('KB loader OK'); \
  });"
  ```
  The assertions must pass. "Non-empty string" is not sufficient — each vertical KB must
  contain at least one string unique to that agent.

**Step 5 — `/prompts/`**: Four files with named exports:
  - `compass.ts` → `export const COMPASS_PROMPT`
  - `architect.ts` → `export const ARCHITECT_PROMPT`
  - `bridge.ts` → `export const BRIDGE_PROMPT`
  - `manager-prompt.ts` → `export const MANAGER_PROMPT`
    *(filename is `manager-prompt.ts`, NOT `manager.ts`, to avoid import ambiguity
    with `/lib/manager.ts` which is created in Sprint 3)*

**Dependencies:** Sprint 1.

**Specific Risks:**
- **R6 (Stale KB):** `loadKnowledgeBase` uses `process.cwd()` + `path.join` for runtime
  reads. Verify: modify a line in `compass.md`, reload the test script without restarting
  the dev server — the change must appear immediately.
- **RISK 2 (KB files missing from Vercel bundle — continued):** `loadKnowledgeBase`
  uses `path.join(process.cwd(), 'knowledge-base', filename)` — this is the exact path
  pattern that `outputFileTracingIncludes` in `next.config.js` (Sprint 1) targets.
  Never use `__dirname` or relative paths — they break in the Vercel serverless environment.
- **RISK 3 (JSON.parse returns `any`):** `RoutingDecision` type defined here in Sprint 2
  will be used in Sprint 3 to type the Manager's JSON output with runtime validation.
  This type must be defined before the route is written.

**Complexity Estimate:** LOW

---

## Sprint 3 — API Route + Manager Agent (Routing Only)

**Objective:** The `/api/chat` route exists, accepts a POST request, calls the Manager LLM
in JSON mode, validates the routing decision, and returns a correct `{ agent, reason }` JSON
— no specialist agent is called yet.

**Verifiable Output:**

Run the following exact curl commands and confirm the expected output for each:

```bash
# Test 1 — First message, no context: must route to compass
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"ho unidea per unesperienza","history":[],"current_agent":null}' \
  | jq '.agent'
# Expected: "compass"

# Test 2 — Skip-qualification attack: must route to compass, not bridge
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"chi sono i partner ideali?","history":[],"current_agent":null}' \
  | jq '.agent'
# Expected: "compass"

# Test 3 — Positive routing test: qualified context must route to architect
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"struttura lesperienza","history":[{"role":"user","content":"ho unidea su Venezia per giovani in transizione, tema fuga dei giovani, format 4 giorni 12 persone, early stage"},{"role":"assistant","content":"{\"partecipanti\":\"giovani in transizione\",\"tema\":\"fuga dei giovani da Venezia\",\"luogo\":\"Venezia\",\"formato\":\"4 giorni, 12 persone\",\"fase_economica\":\"early stage\"}","agent":"compass"}],"current_agent":"compass"}' \
  | jq '.agent'
# Expected: "architect"
```

All three tests must return the expected value. The route must also return HTTP 400 (not 500
and not 200) when `message` is missing or empty.

**Internal implementation notes for the AI IDE:**
- `/lib/manager.ts` contains the `classifyIntent()` function (the LLM call logic).
  `/prompts/manager-prompt.ts` contains the `MANAGER_PROMPT` string constant.
  These are two separate files — never conflate them.
- After `JSON.parse()`, validate the result using the `RoutingDecision` type from
  `/lib/types.ts` AND a runtime guard:
  ```ts
  const VALID_AGENTS: AgentName[] = ['compass', 'architect', 'bridge'];
  if (!VALID_AGENTS.includes(decision.agent)) {
    // fallback — see below
  }
  ```
- **On Manager JSON parse failure or invalid agent value:** Do NOT return HTTP 500 to the
  client. Instead, log the raw Manager output server-side for debugging, and **default to
  `"compass"`** as the fallback agent. The UX must never break because of a Manager
  formatting error. A graceful degradation (defaulting to Compass) is always preferable to
  a 500 error that leaves the user with a broken screen.
- `route.ts` will exceed 40 lines. This is expected and correct. Decompose it into these
  named helper functions (each ≤ 40 lines):
  - `validateRequestBody(body)` — input validation, returns typed body or throws
  - `classifyIntent(message, history, currentAgent)` — in `/lib/manager.ts`
  - `loadKnowledgeBase(agent)` — in `/lib/kb-loader.ts`
  - `buildAgentContext(prompt, kb, history)` — assembles the full LLM context
  - The route handler itself only orchestrates these calls

**Dependencies:** Sprint 1, Sprint 2.

**Specific Risks:**
- **R2 (Manager routing inconsistent):** JSON mode enforced. Runtime validation of the
  `agent` field against `VALID_AGENTS`. Fallback to `"compass"` on any parse or validation
  failure. All three curl tests above must pass.
- **R3 (Latency — Manager call):** Confirm Manager uses the fastest Claude model
  (`claude-3-haiku-20240307` or equivalent). Log the Manager response time to the console.
  Target: under 2 seconds.
- **R5 (API key):** Run `grep -r "ANTHROPIC_API_KEY" ./app/components` — must return
  zero results. The key is accessed only in `route.ts`.
- **R7 (Premature agent switch):** Test 2 above (skip-qualification attack) verifies this
  rule is active. Test 3 verifies the positive routing path works.
- **RISK 3 (JSON.parse returns `any`):** Mitigated by the runtime guard + `RoutingDecision`
  type cast with explicit validation. The `as RoutingDecision` cast is only applied after
  the guard confirms the shape is valid.
- **RISK 1 (No fallback on Manager failure — new):** The fallback to `"compass"` on any
  Manager failure is implemented in this sprint and must be tested: temporarily return an
  invalid JSON from the Manager (e.g., add `"INVALID"` text to the prompt) and confirm the
  route returns `{ agent: "compass" }` instead of a 500 error.

**Complexity Estimate:** MEDIUM

---

## Sprint 4 — Compass Agent + Streaming + Header-Driven Agent State

**Objective:** The full pipeline works end-to-end for Compass: the frontend sends a message,
the API route runs the two-call pipeline (Manager → Compass), streams the response, returns
the agent identity in response headers, and the frontend reads those headers to update the
agent badge — the user sees words appearing in real time with the correct Compass badge.

**Verifiable Output:**
- Type a message in the chat UI (e.g., "Ciao, ho un'idea per un'esperienza a Venezia")
- The UI shows "BIXBG Compass" with the violet badge (`#6475FA`)
- Compass's response streams in word by word (not appearing all at once)
- Compass asks one precise qualifying question (not a generic greeting)
- The browser **Network tab** shows:
  - A streaming `text/event-stream` or `application/octet-stream` response from `/api/chat`
  - Response headers: `x-agent: compass`, `x-agent-color: #6475FA`, `x-agent-name: BIXBG Compass`
- The send button and input field are **disabled** while streaming and **re-enabled** when
  the response completes (dynamic behavior, not hardcoded)

**Streaming implementation pattern (Vercel AI SDK v3+):**
Use `streamText()` from the `ai` package with `toDataStreamResponse()`. Do NOT use
`StreamingTextResponse` — it does not exist in Vercel AI SDK v3+.

```ts
// Correct pattern for AI SDK v3+
import { streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';

const result = await streamText({
  model: createAnthropic()('claude-3-5-sonnet-20241022'),
  system: systemPrompt,
  messages: history,
});

const response = result.toDataStreamResponse();
// Append agent identity headers before returning
response.headers.set('x-agent', agentName);
response.headers.set('x-agent-color', agentColor);
response.headers.set('x-agent-name', agentDisplayName);
return response;
```

**Frontend header-reading pattern:**
Use `useChat`'s `onResponse` callback to read headers before the stream body is consumed:

```ts
const { messages, input, handleSubmit, isLoading } = useChat({
  api: '/api/chat',
  onResponse: (response) => {
    const agent = response.headers.get('x-agent') as AgentName;
    const color = response.headers.get('x-agent-color');
    const name = response.headers.get('x-agent-name');
    if (agent) setCurrentAgent({ agent, color, name });
  },
});
```

Store `currentAgent` in `useState` in the parent component. The `isLoading` flag from
`useChat` controls the disabled state of the input and button.

**Note on useChat vs useState:** `useChat` from the Vercel AI SDK manages message history
internally using its own state. This does not violate the IDE Rule "store history in
React component state" — that rule prohibits `localStorage`, external stores, and `useRef`
as a persistence mechanism. `useChat` is a React hook whose state lives in the React tree
and resets on page reload, which satisfies the session-based, non-persistent requirement.
Do not reimplement streaming manually to satisfy a literal reading of the `useState` rule.

**Fallback (if streaming fails in development):** If `toDataStreamResponse()` produces
an error, add a temporary non-streaming fallback that returns `Response.json({ text, agent })`
so the sprint has a demonstrable working state regardless.

**Dependencies:** Sprint 1, Sprint 2, Sprint 3.

**Specific Risks:**
- **GAP 1 (StreamingTextResponse deprecated):** Fully mitigated by the explicit `streamText +
  toDataStreamResponse` pattern above. The Vercel AI SDK is used at its current v3+ API.
- **GAP 2 (Headers mechanism never implemented):** The `onResponse` callback pattern above
  is the explicit implementation. This is not optional — the badge must be driven by headers,
  never by frontend hardcoding.
- **R4 (Streaming misconfigured):** This is the primary sprint for streaming. Verify in the
  Network tab. The non-streaming fallback ensures the sprint has a working state even if
  streaming configuration needs adjustment.
- **R3 (Latency — double call):** Both LLM calls (Manager + Compass) fire in sequence.
  Log total time from request start to first streamed token. Target: under 3 seconds.
- **R1 (Context window overflow — introduced):** `MAX_HISTORY_MESSAGES = 20` truncation
  from `/lib/agents.ts` is active in the API route from this sprint. Verify by logging
  `history.length` before and after truncation on every request.

**Complexity Estimate:** HIGH

---

## Sprint 5 — Architect + Bridge Agents + Dynamic Agent Switching

**Objective:** All three specialist agents (Compass, Architect, Bridge) are active and the
UI automatically updates the agent name and color as the Manager routes between them —
the user experiences a seamless, invisible handoff across a full qualification→structure→partner flow.

**Verifiable Output:**
Complete this exact sequence manually and confirm every step:

1. Start a new conversation (reload page) → Compass greets with violet badge (`#6475FA`)
2. Provide a full experience profile → Compass produces the `profile` JSON block
3. Reply `"procedi"` → badge switches to orange (`#E8650A`), header shows `x-agent: architect`
4. Architect produces the `experience` JSON block with narrative arc + activities
5. Reply `"chi sono i partner ideali?"` → badge switches to green (`#22C55E`), header shows `x-agent: bridge`
6. Bridge produces the `partners` JSON block with at least one pitch text

**Additional verification checks:**
- Search the rendered output of steps 1–6 for the literal strings `"Compass"`, `"Architect"`,
  `"Bridge"` — none of these must appear in the chat bubble text generated by any agent.
  The badge component may display the agent name; the agent's response text must not.
- Test edge case: mid-Architect conversation, ask `"chi potrebbe sponsorizzare?"` → must
  route to Bridge without losing the Architect conversation context
- Test edge case: reply `"torniamo all'esperienza"` from Bridge → must route back to Architect

**Dependencies:** Sprint 1, Sprint 2, Sprint 3, Sprint 4.

**Specific Risks:**
- **R2 (Manager routing — all paths active):** All routing paths tested simultaneously.
  Log the `reason` field from the Manager for each test case above to confirm routing logic
  is working as intended.
- **R7 (Premature agent switch — stress test):** Run the skip-qualification attack again
  in this sprint: fresh conversation, first message `"chi sono i partner?"` → must route
  to Compass. If Bridge responds, the Manager gate rule is broken — fix before continuing.
- **R1 (Context overflow — realistic load):** Run the full 12–15 message flow above.
  Log total token count sent to the final Bridge LLM call. Confirm `MAX_HISTORY_MESSAGES`
  cap is reducing the history sent to the LLM.

**Complexity Estimate:** HIGH

---

## Sprint 6 — Vercel Deployment + Production Verification

**Objective:** The chatbot is deployed on Vercel at a public URL and the complete
Compass→Architect→Bridge flow works identically in production, including streaming,
KB file access, and header-driven agent badge updates.

**Verifiable Output:**
- A public Vercel URL (e.g., `https://chatbot-bixbg.vercel.app`) accessible from any browser
- Vercel build log shows zero errors and zero warnings about missing files
- `ANTHROPIC_API_KEY` is set as a Vercel Environment Variable in the dashboard (not in the repo)
- The KB files are accessible in production: confirm by checking that Compass responds with
  content referencing the knowledge base (e.g., mentions "Pollica" or "Venezia" when relevant)
  — if it responds only from training data without KB context, the `.md` files are not
  reaching the serverless function
- `streamText + toDataStreamResponse` streaming works on the deployed URL (check Network tab
  in the browser on the Vercel URL — must show streaming, not a single bulk response)
- `git log --all -- .env.local` returns no results (the API key was never committed)

**Known limitation to communicate to Matteo before sharing the URL:**
The deployed URL is publicly accessible — anyone with the link can use the chatbot and will
consume Matteo's Anthropic API credits. This is a deliberate consequence of the no-auth
Anti-Goal. Before sharing the URL, Matteo should set a spending cap on his Anthropic account.
No authentication will be added — this is architecturally out of scope.

**Dependencies:** Sprint 1, Sprint 2, Sprint 3, Sprint 4, Sprint 5.

**Specific Risks:**
- **RISK 2 (KB files missing from Vercel bundle):** The `outputFileTracingIncludes` config
  set in Sprint 1 is the primary mitigation. Verify it worked: check the Vercel build log
  for traces of `knowledge-base/*.md` files included in the function bundle. If KB content
  is missing from production responses, add `standalone` output mode to `next.config.js`
  as a secondary mitigation.
- **R3 (Latency — Vercel cold start):** Set `export const maxDuration = 30` in
  `route.ts` to override the default 10-second serverless function timeout on the free tier.
  Verify: run a full conversation on the deployed URL and confirm no 504 Gateway Timeout
  errors appear.
- **R4 (Streaming in production):** Streaming behavior can differ between local dev and
  Vercel's serverless runtime. Test streaming explicitly on the deployed URL using the
  Network tab — not only locally. If streaming is broken in production but works locally,
  check that `toDataStreamResponse()` is returning the correct Content-Type headers.
- **R5 (API key in production):** Verify the key is in the Vercel dashboard Environment
  Variables, not in any committed file. Run `grep -r "ANTHROPIC_API_KEY" .` and confirm
  only `.env.local` (untracked) and `route.ts` (where it is read, not stored) appear.

**Complexity Estimate:** MEDIUM

---

## Risk Coverage Map

| Risk | Severity | Sprint Where Mitigated |
|---|---|---|
| R1 — Context window overflow | MEDIUM | Sprint 4 (cap introduced), Sprint 5 (validated under realistic load) |
| R2 — Manager routing inconsistent | CRITICAL | Sprint 3 (JSON mode + validation + fallback), Sprint 5 (all routing paths tested) |
| R3 — Latency double call | MEDIUM | Sprint 3 (fast model for Manager), Sprint 4 (streaming), Sprint 6 (Vercel timeout config) |
| R4 — Streaming misconfigured | MEDIUM | Sprint 1 (SDK installed at v3+), Sprint 4 (streamText + toDataStreamResponse + fallback), Sprint 6 (verified in prod) |
| R5 — API key exposed | CRITICAL | Sprint 1 (.gitignore verified), Sprint 3 (grep check), Sprint 6 (Vercel env var confirmed) |
| R6 — Stale KB | MEDIUM | Sprint 2 (runtime read enforced with process.cwd()) |
| R7 — Premature agent switch | MEDIUM | Sprint 3 (Manager gate rule + positive+negative curl tests), Sprint 5 (stress-tested) |
| RISK 1 — No fallback on Manager failure | HIGH (new) | Sprint 3 (fallback to compass implemented + tested) |
| RISK 2 — KB files not in Vercel bundle | HIGH (new) | Sprint 1 (outputFileTracingIncludes), Sprint 2 (process.cwd() path), Sprint 6 (verified in prod) |
| RISK 3 — JSON.parse returns any | MEDIUM (new) | Sprint 3 (RoutingDecision type + runtime guard) |

---

## Anti-Goals Compliance Checklist

The following items must not appear in any sprint, any file, or any dependency:

- [ ] No user authentication or login system
- [ ] No database, ORM, or persistent storage
- [ ] No admin panel or configuration dashboard
- [ ] No payment processing
- [ ] No analytics or tracking SDK
- [ ] No automated test suite (validation is manual, per sprint verifiable outputs)
- [ ] No SEO optimization, accessibility audit, or performance profiling
- [ ] No public-facing interface for participants or partners — internal tool only

---

## Post-Validation Changelog

### GAP 1 — StreamingTextResponse deprecated in Vercel AI SDK v3+
- **Decision:** ACCEPTED
- **Change applied:** Sprint 4 now specifies `streamText() + toDataStreamResponse()` as the
  required pattern, with a complete code example. All references to `StreamingTextResponse`
  have been removed from the plan. A corresponding fix was also applied to `.cursorrules`.
- **Rationale:** The conflict between "latest stable" and `StreamingTextResponse` is real and
  deterministic — a student installing the current SDK would find a missing export. The fix
  is to adopt the v3+ API throughout. The `.cursorrules` file also needed updating.

### GAP 2 — Headers mechanism never implemented in frontend
- **Decision:** ACCEPTED
- **Change applied:** Sprint 4 now includes the explicit `onResponse` callback pattern for
  reading `x-agent`, `x-agent-color`, `x-agent-name` headers and updating React state.
  The exact code pattern is provided.
- **Rationale:** Without this, the badge update mechanism was completely undefined. The
  `onResponse` hook is the correct Vercel AI SDK v3+ mechanism for reading response headers
  before the stream body is consumed.

### GAP 3 — TypeScript types never defined
- **Decision:** ACCEPTED
- **Change applied:** Sprint 2 now begins with explicit creation of `/lib/types.ts` containing
  `AgentName`, `RoutingDecision`, and `ChatMessage` with exact TypeScript syntax provided.
  All subsequent files reference this central type file.
- **Rationale:** Without a shared type file, the AI IDE would invent inconsistent types
  across files. Defining them in Sprint 2 (before any logic files are created) enforces
  consistency.

### GAP 4 — agents.ts never explicitly created
- **Decision:** ACCEPTED
- **Change applied:** Sprint 2 now explicitly creates `/lib/agents.ts` with `MAX_HISTORY_MESSAGES`,
  `AGENT_COLORS`, and `AGENT_NAMES` as named exports with exact values specified.
- **Rationale:** This file was referenced in the IDE Rules and used in Sprint 4 but never
  created. The gap would have caused import errors.

### DEP 1 — Two files named manager.ts in different paths
- **Decision:** ACCEPTED
- **Change applied:** `/prompts/manager.ts` renamed to `/prompts/manager-prompt.ts` throughout
  the plan and in `.cursorrules`. The distinction is now explicit: `/lib/manager.ts` contains
  the routing function; `/prompts/manager-prompt.ts` contains the system prompt string.
- **Rationale:** Silent import errors from filename ambiguity are the worst class of bugs
  in AI-generated code. Renaming eliminates the ambiguity entirely at zero cost.

### DEP 2 — useChat does not expose headers natively
- **Decision:** ACCEPTED
- **Change applied:** Sprint 4 now specifies the `onResponse` callback as the explicit
  mechanism for reading headers from a `useChat` streaming response. Exact code provided.
- **Rationale:** This is non-obvious and would have been left as an unresolved implementation
  detail. Making it explicit prevents the AI IDE from guessing.

### DEP 3 — useChat vs useState-only tension
- **Decision:** PARTIALLY ACCEPTED
- **Change applied:** Sprint 4 includes an explicit note clarifying that `useChat` does not
  violate the "useState only" IDE Rule — that rule prohibits external stores and `localStorage`,
  not React hook-managed state. The plan explicitly says "do not reimplement streaming
  manually to satisfy a literal reading of the useState rule."
- **Rationale:** Full acceptance would require changing the IDE Rule, which was written
  to prevent external state management, not to prohibit `useChat`. A clarifying note in
  the plan resolves the ambiguity without weakening the underlying intent of the rule.
  The `.cursorrules` was also updated with this clarification.

### ORDER 1 — Directory structure not declared as Sprint 1 output
- **Decision:** ACCEPTED
- **Change applied:** Sprint 1's verifiable output now explicitly lists every directory and
  key file (including `next.config.js` and `.env.local`) that must exist after Sprint 1,
  matching the IDE Rules file structure exactly.
- **Rationale:** An AI IDE that reads Sprint 1 must know to create the correct structure
  immediately. "A Next.js project exists" was too vague.

### ORDER 2 — KB files may not be in Vercel bundle
- **Decision:** ACCEPTED
- **Change applied:** `next.config.js` with `outputFileTracingIncludes` is now created in
  Sprint 1 (not Sprint 6). Sprint 2 enforces `process.cwd()` as the only valid path prefix
  in `kb-loader.ts`. Sprint 6 verifies KB accessibility in production. Added as RISK 2 in
  the Risk Coverage Map.
- **Rationale:** This is a production-breaking bug that would only manifest at Sprint 6
  if not addressed earlier. Moving the mitigation to Sprint 1 (configuration) and Sprint 2
  (correct path pattern) eliminates the risk at its root.

### RISK 1 — No fallback agent on Manager JSON parse failure
- **Decision:** PARTIALLY ACCEPTED
- **Change applied:** Sprint 3 now specifies that on Manager JSON parse failure or invalid
  agent value, the route defaults to `"compass"` (not HTTP 500) and logs the raw Manager
  output server-side. Sprint 3 includes a test for this fallback behavior.
- **Rationale:** Full acceptance of "always HTTP 500" is rejected — in a classroom demo,
  a 500 error that freezes the UI is worse than a graceful fallback to Compass. The
  reviewer's identification of the missing fallback is correct; the suggested fix (HTTP 500)
  is replaced with a more robust degradation strategy. The IDE Rules were updated to match.

### RISK 2 — KB files not traced in Vercel bundle
- **Decision:** ACCEPTED (see ORDER 2 above — same issue, same fix)

### RISK 3 — JSON.parse returns any
- **Decision:** ACCEPTED
- **Change applied:** Sprint 3 now specifies the runtime validation guard using `VALID_AGENTS`
  before applying the `RoutingDecision` type cast. The `as RoutingDecision` cast is only
  applied after the shape is validated.
- **Rationale:** This is a real `strict: true` violation. The runtime guard + conditional
  type cast resolves it without requiring unsafe `any`.

### SC 1 — "Disabled button" success criterion ambiguous
- **Decision:** ACCEPTED
- **Change applied:** Sprint 1 criterion now explicitly states the button is "hardcoded-disabled
  as a placeholder" and that dynamic disable/enable is Sprint 4's responsibility.
- **Rationale:** Prevents the AI IDE from delivering a hardcoded button and claiming Sprint 4
  is complete.

### SC 2 — "Non-empty string" too weak for KB loader test
- **Decision:** ACCEPTED
- **Change applied:** Sprint 2's KB loader test now asserts specific strings (`'Belle idee'`
  in shared KB, `'Compass'` in vertical KB) rather than just non-empty.
- **Rationale:** A non-empty wrong file would pass the original test. Specific string
  assertions catch path errors definitively.

### SC 3 — Sprint 3 only has negative routing tests
- **Decision:** ACCEPTED
- **Change applied:** Sprint 3 now includes a third curl test (Test 3) with a qualified
  conversation history that should route to `"architect"`. Both negative (no routing) and
  positive (correct routing) paths are tested in Sprint 3.
- **Rationale:** Finding a Manager bug in Sprint 5 costs more time than Sprint 3. Isolating
  both routing directions in Sprint 3 is strictly better.

### SC 4 — Sprint 5 agent name check not rigorous enough
- **Decision:** ACCEPTED
- **Change applied:** Sprint 5 verifiable output now includes an explicit instruction to
  search rendered chat bubble text for the literal strings `"Compass"`, `"Architect"`,
  `"Bridge"` — none must appear in agent-generated text.
- **Rationale:** A qualitative check ("it seems fine") is not sufficient for an architectural
  constraint. A string search is deterministic and reproducible.

### Anti-Goals — Public URL warning
- **Decision:** ACCEPTED
- **Change applied:** Sprint 6 includes an explicit "Known limitation" note advising Matteo
  that the deployed URL is public and will consume his API credits if shared. Recommends
  setting a spending cap on the Anthropic account.
- **Rationale:** This is not a violation of Anti-Goals — it is a direct consequence of them.
  Documenting the implication is responsible, even if the architectural decision (no auth)
  is correct.

### EXEC 1 — Two manager.ts files causing import ambiguity
- **Decision:** ACCEPTED (see DEP 1 above — same fix)

### EXEC 2 — Default export forbidden but required by Next.js
- **Decision:** ACCEPTED
- **Change applied:** Sprint 1 now contains an explicit note: "`page.tsx` and `layout.tsx`
  use `export default` as required by Next.js App Router — this is the only exception to
  the no-default-export rule." The `.cursorrules` Forbidden Patterns section was updated
  to include this exception.
- **Rationale:** Without an explicit exception, an AI IDE following the rules strictly would
  produce broken Next.js pages or break the framework's required conventions.

### EXEC 3 — 40-line limit incompatible with route.ts complexity
- **Decision:** ACCEPTED
- **Change applied:** Sprint 3 now explicitly declares that `route.ts` will exceed 40 lines
  and names the required helper functions: `validateRequestBody`, `classifyIntent`,
  `loadKnowledgeBase`, `buildAgentContext`. The route handler itself only orchestrates calls.
- **Rationale:** The 40-line rule is correct — it must be applied through decomposition, not
  by abandoning the rule. Naming the expected helper functions gives the AI IDE a deterministic
  decomposition target instead of inventing its own structure.

### EXEC 4 — No exact curl command in Sprint 3
- **Decision:** ACCEPTED
- **Change applied:** Sprint 3 now provides three exact, copy-paste-ready curl commands with
  expected outputs. All edge cases (negative test, positive test, validation test) are covered.
- **Rationale:** "Test using curl or Postman" produces three different workflows. One
  command is unambiguous.
