# Sprint 2 Sub-Plan — Types + Agent Config + Knowledge Base + System Prompts

> **How to read this document:** Tasks are in strict execution order.
> Each task has exactly one output. Complete and verify each task before starting the next.
> The AI IDE must execute each task exactly as written — no interpretation, no shortcuts.

---

### Task 2.1 — Create `/lib/types.ts` with all shared TypeScript types

**Files involved:**
- `/lib/types.ts` (create new)

**Required input:**
- Sprint 1 complete (`/lib/` directory exists)

**Expected output:**
`/lib/types.ts` exists with exactly this content — no additions, no modifications,
no reordering:

```ts
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
```

**Success criterion:**
Run:
```bash
npx tsc --noEmit
```
Output must be blank (zero errors, zero warnings). The file must not use `export default`.

---

### Task 2.2 — Create `/lib/agents.ts` with agent constants and history cap

**Files involved:**
- `/lib/agents.ts` (create new)

**Required input:**
- Task 2.1 complete (`AgentName` type exists and compiles)

**Expected output:**
`/lib/agents.ts` exports three constants using the `AgentName` type from `types.ts`.
Exact content:

```ts
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
```

**Success criterion:**
Run:
```bash
npx tsc --noEmit
```
Zero errors. Then verify the values are correct at runtime:
```bash
npx tsx -e "
import { MAX_HISTORY_MESSAGES, AGENT_COLORS, AGENT_NAMES } from './lib/agents.ts';
console.assert(MAX_HISTORY_MESSAGES === 20, 'wrong cap');
console.assert(AGENT_COLORS.compass === '#6475FA', 'wrong compass color');
console.assert(AGENT_COLORS.architect === '#E8650A', 'wrong architect color');
console.assert(AGENT_COLORS.bridge === '#22C55E', 'wrong bridge color');
console.assert(AGENT_NAMES.compass === 'BIXBG Compass', 'wrong compass name');
console.log('agents.ts OK');
"
```
Output must be `agents.ts OK`.

---

### Task 2.3 — Create `/knowledge-base/shared.md` from the source document

**Files involved:**
- `/knowledge-base/shared.md` (create new)
- `/03_Shared_KB.md` (read — source of content)

**Required input:**
- Sprint 1 complete (`/knowledge-base/` directory exists)

**Expected output:**
`/knowledge-base/shared.md` contains the full content of `03_Shared_KB.md`, starting
from the first `## ` section heading (i.e., from `## 1. IDENTITÀ & VALORI` onwards —
skip the `#` title line, the `> Cos'è questo documento:` blockquote, and the first `---`
separator, as those are administrative notes not needed by the LLM).

**Success criterion:**
Run:
```bash
grep -c "Belle idee x Bella gente" knowledge-base/shared.md
```
Output must be `1` or higher (the string appears at least once).

```bash
grep -c "Modello Economico" knowledge-base/shared.md
```
Output must be `1` or higher. Both checks must pass.

---

### Task 2.4 — Create `/knowledge-base/compass.md` from the source document

**Files involved:**
- `/knowledge-base/compass.md` (create new)
- `/05_Discovery_KB_ORIGINAL.md` (read — source of content)

**Required input:**
- Sprint 1 complete (`/knowledge-base/` directory exists)

**Expected output:**
`/knowledge-base/compass.md` contains the content of `05_Discovery_KB_ORIGINAL.md`,
starting from `## Role` onwards (skip the `#` title and the `>` blockquote).

**Success criterion:**
```bash
grep -c "Matrice di Qualificazione" knowledge-base/compass.md
```
Output must be `1` or higher.

```bash
grep -c "Checklist di Qualificazione" knowledge-base/compass.md
```
Output must be `1` or higher. Both checks must pass.

---

### Task 2.5 — Create `/knowledge-base/architect.md` from the source document

**Files involved:**
- `/knowledge-base/architect.md` (create new)
- `/07_Sales_KB.md` (read — source of content)

**Required input:**
- Sprint 1 complete (`/knowledge-base/` directory exists)

**Expected output:**
`/knowledge-base/architect.md` contains the content of `07_Sales_KB.md`,
starting from `## Role` onwards (skip the `#` title and the `>` blockquote).

**Success criterion:**
```bash
grep -c "Framework Narrativo" knowledge-base/architect.md
```
Output must be `1` or higher.

```bash
grep -c "Repertorio Attività" knowledge-base/architect.md
```
Output must be `1` or higher. Both checks must pass.

---

### Task 2.6 — Create `/knowledge-base/bridge.md` from the source document

**Files involved:**
- `/knowledge-base/bridge.md` (create new)
- `/09_Support_KB.md` (read — source of content)

**Required input:**
- Sprint 1 complete (`/knowledge-base/` directory exists)

**Expected output:**
`/knowledge-base/bridge.md` contains the content of `09_Support_KB.md`,
starting from `## Role` onwards (skip the `#` title and the `>` blockquote).

**Success criterion:**
```bash
grep -c "Mappa delle Tipologie di Partner" knowledge-base/bridge.md
```
Output must be `1` or higher.

```bash
grep -c "Strategia per Fase del Progetto" knowledge-base/bridge.md
```
Output must be `1` or higher. Both checks must pass.

---

### Task 2.7 — Create `/lib/kb-loader.ts` with the `loadKnowledgeBase` function

**Files involved:**
- `/lib/kb-loader.ts` (create new)

**Required input:**
- Task 2.1 complete (`AgentName` type exists)
- Tasks 2.3–2.6 complete (all four `.md` KB files exist in `/knowledge-base/`)

**Expected output:**
`/lib/kb-loader.ts` exports a single async function `loadKnowledgeBase` that reads
the shared KB and the agent-specific vertical KB from the filesystem at request time.
Must use `process.cwd()` + `path.join` — never `__dirname` or relative paths.
Exact file content:

```ts
import * as fs from 'fs';
import * as path from 'path';
import type { AgentName } from './types';

/**
 * Reads a single .md file from /knowledge-base/ at runtime.
 * Returns an empty string on any read error — never throws.
 * @param filename - Filename within /knowledge-base/ (e.g. 'shared.md')
 */
async function readKbFile(filename: string): Promise<string> {
  // Guard: read failure returns empty string instead of crashing the route
  try {
    const filePath = path.join(process.cwd(), 'knowledge-base', filename);
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch (err) {
    console.warn(`[kb-loader] Could not read '${filename}':`, err);
    return '';
  }
}

/**
 * Loads the shared Knowledge Base and the agent-specific vertical KB.
 * Both files are read at request time (not build time) so edits to .md
 * files take effect immediately without restarting the dev server (Risk R6).
 * Uses process.cwd() for Vercel serverless runtime compatibility (Risk 2).
 * @param agent - The active agent: 'compass' | 'architect' | 'bridge'
 * @returns { shared, vertical } — both as strings, empty string if file missing
 */
export async function loadKnowledgeBase(
  agent: AgentName,
): Promise<{ shared: string; vertical: string }> {
  const [shared, vertical] = await Promise.all([
    readKbFile('shared.md'),
    readKbFile(`${agent}.md`),
  ]);
  return { shared, vertical };
}
```

**Success criterion:**
Run `npx tsc --noEmit` — zero errors. The file must not use `export default`.

---

### Task 2.8 — Verify `loadKnowledgeBase` reads correct content and respects runtime-read behavior (R6 + RISK 2)

**Files involved:**
- `/lib/kb-loader.ts` (read and execute)
- `/knowledge-base/compass.md` (temporarily modify and revert)

**Required input:**
- Task 2.7 complete (`kb-loader.ts` exists and compiles)
- Tasks 2.3–2.6 complete (all KB files populated with real content)

**Expected output:**
Confirmed proof that: (a) the correct content is returned for each agent, (b) file changes
appear in the next call without restarting any process.

**Success criterion:**

**Step A — Correct content returned:**
```bash
npx tsx -e "
import { loadKnowledgeBase } from './lib/kb-loader.ts';
const r = await loadKnowledgeBase('compass');
console.assert(r.shared.includes('Belle idee'), 'FAIL: shared KB missing key string');
console.assert(r.vertical.includes('Matrice di Qualificazione'), 'FAIL: compass KB missing key string');
console.log('compass: OK');

const r2 = await loadKnowledgeBase('architect');
console.assert(r2.vertical.includes('Framework Narrativo'), 'FAIL: architect KB missing key string');
console.log('architect: OK');

const r3 = await loadKnowledgeBase('bridge');
console.assert(r3.vertical.includes('Mappa delle Tipologie'), 'FAIL: bridge KB missing key string');
console.log('bridge: OK');
"
```
All three lines `compass: OK`, `architect: OK`, `bridge: OK` must appear with no FAIL messages.

**Step B — Runtime read verified (R6 mitigation):**
1. Add the line `# TEST_MARKER_RUNTIME_READ` at the top of `knowledge-base/compass.md`
2. Without restarting dev server or any process, immediately run:
```bash
npx tsx -e "
import { loadKnowledgeBase } from './lib/kb-loader.ts';
const r = await loadKnowledgeBase('compass');
console.assert(r.vertical.includes('TEST_MARKER_RUNTIME_READ'), 'FAIL: runtime read not working');
console.log('runtime read: OK');
"
```
Output must be `runtime read: OK`.
3. Remove `# TEST_MARKER_RUNTIME_READ` from `compass.md` and save.
4. Confirm the marker is gone:
```bash
grep "TEST_MARKER_RUNTIME_READ" knowledge-base/compass.md && echo "FAIL: marker not removed" || echo "cleanup: OK"
```
Output must be `cleanup: OK`.

---

### Task 2.9 — Create `/prompts/compass.ts` with the Compass system prompt

**Files involved:**
- `/prompts/compass.ts` (create new)
- `/04_Discovery_Prompt_ORIGINAL.md` (read — source of prompt content)

**Required input:**
- Sprint 1 complete (`/prompts/` directory exists)

**Expected output:**
`/prompts/compass.ts` exports the Compass system prompt as a named TypeScript string
constant. The prompt content is everything in `04_Discovery_Prompt_ORIGINAL.md` from
the first `## SCOPE & ROLE (S)` heading onwards — skip the `#` title, the `>` admin
blockquote, and the first `---` separator. Structure:

```ts
/**
 * COMPASS_PROMPT — system prompt for the BIXBG Compass agent.
 * Source: 04_Discovery_Prompt_ORIGINAL.md
 * Compass qualifies new experience ideas through a structured 6-step sequence.
 */
export const COMPASS_PROMPT = `
[full content from 04_Discovery_Prompt_ORIGINAL.md starting at ## SCOPE & ROLE (S)]
`;
```

**Success criterion:**
Run:
```bash
npx tsx -e "
import { COMPASS_PROMPT } from './prompts/compass.ts';
console.assert(typeof COMPASS_PROMPT === 'string', 'FAIL: not a string');
console.assert(COMPASS_PROMPT.includes('SCOPE'), 'FAIL: missing SCOPE section');
console.assert(COMPASS_PROMPT.includes('STARS'), 'FAIL: missing STARS reference');
console.assert(COMPASS_PROMPT.includes('italiano'), 'FAIL: missing language instruction');
console.log('COMPASS_PROMPT: OK — length:', COMPASS_PROMPT.length, 'chars');
"
```
All assertions must pass. Length must be greater than 500 characters. The file must not
use `export default`.

---

### Task 2.10 — Create `/prompts/architect.ts` with the Architect system prompt

**Files involved:**
- `/prompts/architect.ts` (create new)
- `/06_Sales_Prompt.md` (read — source of prompt content)

**Required input:**
- Sprint 1 complete (`/prompts/` directory exists)

**Expected output:**
`/prompts/architect.ts` exports `ARCHITECT_PROMPT` as a named string constant.
Content is everything in `06_Sales_Prompt.md` from `## SCOPE & ROLE (S)` onwards.

```ts
/**
 * ARCHITECT_PROMPT — system prompt for the BIXBG Architect agent.
 * Source: 06_Sales_Prompt.md
 * Architect builds the creative and operational structure of a qualified experience.
 */
export const ARCHITECT_PROMPT = `
[full content from 06_Sales_Prompt.md starting at ## SCOPE & ROLE (S)]
`;
```

**Success criterion:**
```bash
npx tsx -e "
import { ARCHITECT_PROMPT } from './prompts/architect.ts';
console.assert(typeof ARCHITECT_PROMPT === 'string', 'FAIL: not a string');
console.assert(ARCHITECT_PROMPT.includes('narrative arc'), 'FAIL: missing narrative arc reference');
console.assert(ARCHITECT_PROMPT.includes('experience'), 'FAIL: missing experience block reference');
console.assert(ARCHITECT_PROMPT.includes('italiano'), 'FAIL: missing language instruction');
console.log('ARCHITECT_PROMPT: OK — length:', ARCHITECT_PROMPT.length, 'chars');
"
```
All assertions must pass. Length must be greater than 500 characters. No `export default`.

---

### Task 2.11 — Create `/prompts/bridge.ts` with the Bridge system prompt

**Files involved:**
- `/prompts/bridge.ts` (create new)
- `/08_Support_Prompt.md` (read — source of prompt content)

**Required input:**
- Sprint 1 complete (`/prompts/` directory exists)

**Expected output:**
`/prompts/bridge.ts` exports `BRIDGE_PROMPT` as a named string constant.
Content is everything in `08_Support_Prompt.md` from `## SCOPE & ROLE (S)` onwards.

```ts
/**
 * BRIDGE_PROMPT — system prompt for the BIXBG Bridge agent.
 * Source: 08_Support_Prompt.md
 * Bridge identifies partner profiles and produces pitch texts for a structured experience.
 */
export const BRIDGE_PROMPT = `
[full content from 08_Support_Prompt.md starting at ## SCOPE & ROLE (S)]
`;
```

**Success criterion:**
```bash
npx tsx -e "
import { BRIDGE_PROMPT } from './prompts/bridge.ts';
console.assert(typeof BRIDGE_PROMPT === 'string', 'FAIL: not a string');
console.assert(BRIDGE_PROMPT.includes('partner'), 'FAIL: missing partner reference');
console.assert(BRIDGE_PROMPT.includes('pitch'), 'FAIL: missing pitch reference');
console.assert(BRIDGE_PROMPT.includes('italiano'), 'FAIL: missing language instruction');
console.log('BRIDGE_PROMPT: OK — length:', BRIDGE_PROMPT.length, 'chars');
"
```
All assertions must pass. Length must be greater than 500 characters. No `export default`.

---

### Task 2.12 — Create `/prompts/manager-prompt.ts` with the Manager system prompt

**Files involved:**
- `/prompts/manager-prompt.ts` (create new — filename is `manager-prompt.ts`,
  NOT `manager.ts`, to avoid import ambiguity with `/lib/manager.ts` created in Sprint 3)
- `/10_Manager_Prompt_ORIGINAL.md` (read — source of prompt content)

**Required input:**
- Sprint 1 complete (`/prompts/` directory exists)

**Expected output:**
`/prompts/manager-prompt.ts` exports `MANAGER_PROMPT` as a named string constant.
Content is everything in `10_Manager_Prompt_ORIGINAL.md` from `## Role` onwards
(skip the `#` title, `>` blockquote, and first `---`).

```ts
/**
 * MANAGER_PROMPT — system prompt for the BIXBG Manager Agent.
 * Source: 10_Manager_Prompt_ORIGINAL.md
 * The Manager never speaks to the user. Its only output is a JSON routing decision.
 * IMPORTANT: import from '@/prompts/manager-prompt' — NOT from '@/lib/manager'
 * which contains the routing FUNCTION, not the prompt STRING.
 */
export const MANAGER_PROMPT = `
[full content from 10_Manager_Prompt_ORIGINAL.md starting at ## Role]
`;
```

**Success criterion:**
```bash
npx tsx -e "
import { MANAGER_PROMPT } from './prompts/manager-prompt.ts';
console.assert(typeof MANAGER_PROMPT === 'string', 'FAIL: not a string');
console.assert(MANAGER_PROMPT.includes('compass'), 'FAIL: missing compass routing rule');
console.assert(MANAGER_PROMPT.includes('architect'), 'FAIL: missing architect routing rule');
console.assert(MANAGER_PROMPT.includes('bridge'), 'FAIL: missing bridge routing rule');
console.assert(MANAGER_PROMPT.includes('JSON'), 'FAIL: missing JSON output instruction');
console.log('MANAGER_PROMPT: OK — length:', MANAGER_PROMPT.length, 'chars');
"
```
All assertions must pass. Length must be greater than 1000 characters (the Manager prompt
is the longest). No `export default`.

---

### Task 2.13 — Run full TypeScript compilation check across the entire project

**Files involved:**
- All files in `/lib/`, `/prompts/` (read by compiler)
- `tsconfig.json` (read by compiler)

**Required input:**
- Tasks 2.1 through 2.12 all complete

**Expected output:**
Confirmed proof that the entire project compiles without errors under `strict: true`.

**Success criterion:**
Run:
```bash
npx tsc --noEmit
```
The command must exit with **zero output** (no errors, no warnings). Any output means
a task above was completed incorrectly — identify which file the error is in and fix it
before proceeding to Sprint 3.

Additionally, verify the file structure is exactly as specified:
```bash
ls lib/
# Must include: types.ts  agents.ts  kb-loader.ts

ls prompts/
# Must include: compass.ts  architect.ts  bridge.ts  manager-prompt.ts
# Must NOT include: manager.ts (reserved for /lib/manager.ts in Sprint 3)

ls knowledge-base/
# Must include: shared.md  compass.md  architect.md  bridge.md
```
All three `ls` commands must show exactly the listed files and no others (excluding `.gitkeep`).

---

## Sprint 2 — Completion Checklist

Before marking Sprint 2 as complete, confirm every item:

- [ ] `npx tsc --noEmit` runs with zero errors across the full project
- [ ] `/lib/types.ts` exports `AgentName`, `RoutingDecision`, `ChatMessage`
- [ ] `/lib/agents.ts` exports `MAX_HISTORY_MESSAGES = 20`, `AGENT_COLORS`, `AGENT_NAMES` with correct values
- [ ] `/knowledge-base/shared.md` contains the BIXBG shared knowledge base content
- [ ] `/knowledge-base/compass.md` contains Compass-specific KB content
- [ ] `/knowledge-base/architect.md` contains Architect-specific KB content
- [ ] `/knowledge-base/bridge.md` contains Bridge-specific KB content
- [ ] `/lib/kb-loader.ts` uses `process.cwd()` + `path.join` (never `__dirname`)
- [ ] Task 2.8 runtime-read verification passed (marker appeared without restart)
- [ ] `/prompts/compass.ts` exports `COMPASS_PROMPT` as a named string constant
- [ ] `/prompts/architect.ts` exports `ARCHITECT_PROMPT` as a named string constant
- [ ] `/prompts/bridge.ts` exports `BRIDGE_PROMPT` as a named string constant
- [ ] `/prompts/manager-prompt.ts` exports `MANAGER_PROMPT` (filename is `manager-prompt.ts`)
- [ ] No file in `/lib/` or `/prompts/` uses `export default`
- [ ] No file uses `__dirname` for path construction
