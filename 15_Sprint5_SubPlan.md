# Sprint 5 Sub-Plan — Architect + Bridge Agents + Dynamic Agent Switching

> **Scope:** Sprint 4 already built a generic pipeline that supports all three agents.
> Sprint 5 has two small code additions (reason logging + auto-scroll) and seven
> structured verification sequences. Tasks are ordered: build first, verify second.

---

### Task 5.1 — Add routing `reason` logging to `classifyIntent` in manager.ts

**Files involved:**
- `/lib/manager.ts` (modify — one line added after the validation guard)

**Required input:**
- Sprint 4 complete (`classifyIntent` exists and logs latency)

**Expected output:**
After a successful routing decision is validated, `classifyIntent` logs the agent and
the reason to the server console. Add this line immediately after the `return parsed as RoutingDecision` line (i.e., inside the `if` block that validates the shape, before the return):

```ts
// R2 mitigation: log every routing decision with reason for debugging
console.log(`[manager] Route → ${(parsed as RoutingDecision).agent} | reason: ${(parsed as RoutingDecision).reason}`);
return parsed as RoutingDecision;
```

Also add the same log line in the fallback paths:
```ts
// In the invalid-shape fallback:
console.warn('[manager] Invalid shape → fallback: compass | reason: invalid output shape');
return { agent: 'compass', reason: 'fallback: invalid manager output shape' };

// In the catch block:
console.error(`[manager] Error → fallback: compass | after ${elapsed}ms`);
return { agent: 'compass', reason: 'fallback: manager call or parse failed' };
```

**Success criterion:**
```bash
npx tsc --noEmit
```
Zero errors. Send a test message from the UI. The `npm run dev` terminal must show a line
in this format:
```
[manager] Route → compass | reason: [text explaining why compass was chosen]
```
The reason text must be non-empty — not `undefined` or `null`.

---

### Task 5.2 — Add auto-scroll to the bottom of the message list in `ChatWindow`

**Files involved:**
- `/app/components/ChatWindow.tsx` (modify — add `useRef`, `useEffect`, and a scroll anchor element)

**Required input:**
- Sprint 4 complete (`ChatWindow` uses `useChat`)

**Expected output:**
The message list automatically scrolls to the latest message whenever a new message
is added or a stream updates. Add the following to `ChatWindow`:

At the top of the function body (after the `useChat` call):
```ts
// useRef used here for DOM access only — not for state storage (IDE Rules exception)
const messagesEndRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  // Smooth-scroll to the bottom anchor whenever the message list updates
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);
```

Add the corresponding import at the top of the file:
```ts
import { useState, useRef, useEffect } from 'react';
```

At the very bottom of the message list `<div>`, after the last `MessageBubble`:
```tsx
{/* Scroll anchor — scrollIntoView target */}
<div ref={messagesEndRef} />
```

**Success criterion:**
Open `http://localhost:3000`. Resize the browser window to be short (so the message list
needs to scroll). Send 5–6 messages back and forth with Compass. After each response
completes, the view must automatically scroll to show the latest message at the bottom.
No horizontal scroll should appear. No console errors. `npx tsc --noEmit` must pass.

---

### Task 5.3 — Run the full Compass → Architect → Bridge conversation flow

**Files involved:**
- Browser UI (observe only)
- Terminal running `npm run dev` (observe logs)

**Required input:**
- Task 5.1 complete (reason logging active)
- Task 5.2 complete (auto-scroll working)

**Expected output:**
Confirmed, step-by-step, that all three agents activate correctly in sequence, each
with the correct badge color, and that their responses match their respective roles.

**Success criterion:**
Execute these exact steps in the browser and confirm every check:

**Step 1 — Reload the page:**
- Badge shows "BIXBG Compass" in violet `#6475FA` ✓
- Welcome message visible ✓

**Step 2 — Send this exact message:**
> `"Ho un'idea per un'esperienza a Venezia. I partecipanti sono giovani professionisti in transizione, 25-35 anni, curiosi ma con routine rigida. Il tema è la fuga dei giovani: perché si va, perché alcuni restano. Voglio un formato di 4 giorni, 12 persone, early stage."`

Expected outcome:
- Compass responds with a follow-up question (not a profile block — qualification is not complete)
- Badge stays violet ✓
- Terminal shows: `[manager] Route → compass | reason: [...]` ✓

**Step 3 — Send:** `"Il luogo è Venezia perché incarna esattamente quel tema. Il bisogno è capire cosa significa scegliere un posto sapendo che sta morendo."`

Expected outcome:
- Compass responds with the `profile` JSON block and asks if to proceed to structure or partners
- Terminal shows: `[manager] Route → compass | reason: [...]` ✓

**Step 4 — Send:** `"procedi"`

Expected outcome:
- Badge switches to "BIXBG Architect" in orange `#E8650A` ✓
- Terminal shows: `[manager] Route → architect | reason: [...]` ✓
- Browser Network tab → Response Headers: `x-agent: architect` ✓

**Step 5 — Architect produces its structured response:**
- Response contains a narrative arc (inizio / centro / fine or equivalent) ✓
- Response contains at least one activity tied to the Venezia theme ✓
- Response is in Italian ✓

**Step 6 — Send:** `"chi sono i partner ideali per questa esperienza?"`

Expected outcome:
- Badge switches to "BIXBG Bridge" in green `#22C55E` ✓
- Terminal shows: `[manager] Route → bridge | reason: [...]` ✓
- Browser Network tab → Response Headers: `x-agent: bridge` ✓

**Step 7 — Bridge produces its partner response:**
- Response includes at least one specific partner category ✓
- Response includes a pitch text of 5+ lines ✓
- Response is in Italian ✓

All 7 steps must pass before continuing.

---

### Task 5.4 — Verify no agent names appear inside chat bubble text

**Files involved:**
- Browser UI (observe only)

**Required input:**
- Task 5.3 complete (full conversation from steps 1–7 is visible in the chat)

**Expected output:**
Confirmed that the words `"Compass"`, `"Architect"`, `"Bridge"` do not appear in
any chat bubble generated by any agent — only in the badge UI element.

**Success criterion:**
With the full conversation from Task 5.3 visible in the browser:

1. Open **DevTools → Console**
2. Run this JavaScript snippet to scan all rendered chat bubble text:
```js
const bubbles = document.querySelectorAll('.overflow-y-auto p, .overflow-y-auto div');
const forbidden = ['Compass', 'Architect', 'Bridge'];
let violations = [];
bubbles.forEach(el => {
  forbidden.forEach(word => {
    if (el.innerText?.includes(word) && el.children.length === 0) {
      violations.push({ word, text: el.innerText.slice(0, 80) });
    }
  });
});
console.log(violations.length === 0 ? '✓ No forbidden words found' : violations);
```

Expected console output: `✓ No forbidden words found`

If violations are found: the agent's system prompt `RULES` section forbidding handoff
language is not working as intended — the relevant forbidden words
(`agente | cambio agente | ti passo | ti connetto | collega | trasferisco`) are in the
prompts but the specific names `Compass`, `Architect`, `Bridge` may need to be added
explicitly to the VIETATO list in each system prompt.

---

### Task 5.5 — Run the R7 skip-qualification stress test

**Files involved:**
- Browser UI (fresh session)
- Terminal running `npm run dev` (observe logs)

**Required input:**
- Task 5.4 complete

**Expected output:**
Confirmed that even after Sprint 5's changes, the Manager gate rule still blocks
premature routing to Bridge or Architect on a fresh conversation.

**Success criterion:**
Reload the page (fresh session, no history). Send this message:
> `"chi sono i partner ideali?"`

Confirm:
- Badge stays violet (Compass) ✓
- Compass responds asking for basic context, NOT with a partner map ✓
- Terminal shows: `[manager] Route → compass | reason: [text mentioning missing qualification]` ✓

Then send:
> `"struttura l'esperienza"`

Confirm:
- Badge stays violet (Compass) ✓
- Compass responds asking for context, NOT with an experience structure ✓
- Terminal shows: `[manager] Route → compass | reason: [...]` ✓

Both sub-tests must pass. If either fails, the Manager prompt's critical gate rule is
broken — halt Sprint 5 and fix the MANAGER_PROMPT in `manager-prompt.ts` before continuing.

---

### Task 5.6 — Test edge case: bridge switch mid-Architect conversation, then back

**Files involved:**
- Browser UI
- Terminal running `npm run dev` (observe logs)

**Required input:**
- Task 5.5 complete

**Expected output:**
Confirmed that the Manager correctly handles context switches between Architect and Bridge
mid-conversation, and returns to Architect when the partner digression is resolved.

**Success criterion:**
Start with a conversation that has reached Architect (repeat Steps 1–5 from Task 5.3,
or continue from an existing session where Architect is active).

**Switch TO Bridge mid-Architect:**
Send: `"chi potrebbe sponsorizzare questa esperienza?"`
- Badge switches to green (Bridge) ✓
- Terminal: `[manager] Route → bridge | reason: [mentions partner/sponsor]` ✓
- Bridge responds with at least one partner type and a pitch ✓

**Switch BACK to Architect:**
Send: `"torniamo alla struttura dell'esperienza"`
- Badge switches back to orange (Architect) ✓
- Terminal: `[manager] Route → architect | reason: [mentions experience/structure]` ✓
- Architect responds referencing the Venezia experience context (proving history was preserved) ✓

All six checks must pass. If the back-switch fails, confirm that the conversation history
(including the Bridge exchange) is being sent to the route, so the Manager has context
for the re-routing.

---

### Task 5.7 — Verify R2: routing reasons are meaningful across all agent transitions

**Files involved:**
- Terminal running `npm run dev` (read logs from the full Session in Tasks 5.3–5.6)

**Required input:**
- Task 5.6 complete (logs accumulated from the full test session)

**Expected output:**
Confirmed that every `[manager] Route →` log line has a non-generic, non-empty `reason`
field that explains the routing decision.

**Success criterion:**
Scroll through the `npm run dev` terminal and locate all `[manager] Route →` lines
produced during Tasks 5.3–5.6. For each line:

| Transition | Expected reason content (must include at least one of these words) |
|---|---|
| Any → Compass (default or qualification) | "qualification", "context", "experience idea", "first message", "missing" |
| Compass → Architect | "profile", "complete", "structure", "proceed", "architect" |
| Architect → Bridge | "partner", "sponsor", "fund", "bridge" |
| Bridge → Architect | "structure", "experience", "architect", "back" |
| Any → Compass (fallback) | "fallback" |

No `reason` field may be the literal string `"undefined"` or empty. If any reason is
empty, the Manager LLM is not including the `reason` field in its JSON output — add
an explicit instruction to the MANAGER_PROMPT reminding it that the `reason` field is
required in every response.

---

### Task 5.8 — Verify R1: history truncation activates correctly in a long conversation

**Files involved:**
- Terminal running `npm run dev` (observe logs)
- Browser UI (send messages)

**Required input:**
- Task 5.7 complete

**Expected output:**
Confirmed that after 10+ conversational exchanges (20+ messages in history), the
`[route] History: N → M messages (R1 cap)` log shows M ≤ 20, proving the truncation
is active and preventing context overflow.

**Success criterion:**
Continue the existing conversation from Tasks 5.3–5.6 (which should already have
8–10 exchanges). Send 5 more messages (any content — even short replies like "ok",
"grazie", "continua") to push the history past the 20-message threshold.

In the terminal, find log lines in the format:
```
[route] History: N → M messages (R1 cap)
```

Confirm:
- As the conversation grows, N increases ✓
- Once N exceeds 20, M is capped at 20 (never exceeds it) ✓
- The route does NOT crash or return a 500 error at high N ✓

Example expected log sequence:
```
[route] History: 18 → 18 messages (R1 cap)
[route] History: 20 → 20 messages (R1 cap)
[route] History: 22 → 20 messages (R1 cap)   ← cap is active
[route] History: 24 → 20 messages (R1 cap)   ← stable at 20
```

The third and fourth lines (N > 20, M = 20) must appear before this task is complete.

---

### Task 5.9 — Run the final TypeScript compilation check

**Files involved:**
- All files in `/lib/`, `/app/components/`, `/app/api/` (read by compiler)

**Required input:**
- Tasks 5.1 and 5.2 complete (the only code changes in Sprint 5)

**Expected output:**
Confirmed zero TypeScript errors across the full project after Sprint 5 changes.

**Success criterion:**
```bash
npx tsc --noEmit
```
Output must be blank — zero errors, zero warnings. If any error appears, it is caused
by either the `useRef` addition (Task 5.2) or the reason logging addition (Task 5.1) —
identify the file from the error output and fix it before marking Sprint 5 complete.

---

## Sprint 5 — Completion Checklist

Before marking Sprint 5 as complete, confirm every item:

**Code changes:**
- [ ] `classifyIntent` logs `[manager] Route → {agent} | reason: {reason}` on every call
- [ ] Fallback paths in `classifyIntent` log a warning with "fallback" in the reason
- [ ] `ChatWindow` auto-scrolls to the latest message on every update
- [ ] `npx tsc --noEmit` passes with zero errors

**Full conversation flow (Task 5.3):**
- [ ] Compass active with violet badge on fresh load
- [ ] Compass produces `profile` block after full qualification
- [ ] `"procedi"` triggers Architect + orange badge
- [ ] Architect produces experience structure with narrative arc
- [ ] Partner question triggers Bridge + green badge
- [ ] Bridge produces partner map with at least one pitch text

**Additional verifications:**
- [ ] No `"Compass"`, `"Architect"`, `"Bridge"` strings in any chat bubble text (Task 5.4)
- [ ] Skip-qualification attack routes to Compass on fresh session (Task 5.5, R7)
- [ ] Mid-Architect Bridge switch works correctly (Task 5.6)
- [ ] Bridge → Architect back-switch works correctly (Task 5.6)
- [ ] All `[manager] Route →` log lines have non-empty reasons (Task 5.7, R2)
- [ ] History truncation shows `N → 20` in logs once conversation exceeds 20 messages (Task 5.8, R1)

**Anti-goal compliance:**
- [ ] No `localStorage` or `sessionStorage` referenced in any file
- [ ] Reloading the page clears all conversation history (verified manually)
- [ ] No authentication, no database, no admin UI introduced
