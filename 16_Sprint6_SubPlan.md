# Sprint 6 Sub-Plan — Vercel Deployment + Production Verification

> **Scope:** Sprint 6 has three phases: pre-deploy hardening (Tasks 6.1–6.3),
> deployment setup (Tasks 6.4–6.7), and production verification (Tasks 6.8–6.13).
> All code changes happen before the first deploy. All verifications happen on the live URL.

---

### Task 6.1 — Add `maxDuration = 30` to `route.ts` to override the Vercel free-tier timeout

**Files involved:**
- `/app/api/chat/route.ts` (modify — add one export at the top of the file)

**Required input:**
- Sprint 5 complete (`route.ts` is fully functional)

**Expected output:**
`route.ts` exports the Vercel route configuration constant that increases the serverless
function timeout from the default 10 seconds to 30 seconds. Add this line at the very
top of `/app/api/chat/route.ts`, after the import block:

```ts
/**
 * maxDuration — Vercel serverless function timeout override.
 * Default free-tier timeout is 10s, which is too short for two sequential LLM calls.
 * 30s accommodates the Manager call + specialist agent call + streaming setup (Risk R3).
 */
export const maxDuration = 30;
```

**Success criterion:**
```bash
npx tsc --noEmit
```
Zero errors. Confirm the export is in the file:
```bash
grep "maxDuration" app/api/chat/route.ts
# Expected: export const maxDuration = 30;
```

---

### Task 6.2 — Run the pre-deploy security and compilation audit

**Files involved:**
- All project files (read by `tsc` and `grep`)
- `/.env.local` (must be untracked)
- `/.gitignore` (must list `.env.local`)

**Required input:**
- Task 6.1 complete

**Expected output:**
Confirmed proof that the project compiles cleanly with zero errors, the API key is not
committed anywhere, and `.env.local` is untracked by Git.

**Success criterion:**
Run all four commands and confirm every expected output:

```bash
# 1. TypeScript compiles cleanly
npx tsc --noEmit
# Expected: no output (blank)

# 2. .env.local is not tracked
git status
# Expected: .env.local does NOT appear anywhere in the output

# 3. API key appears only in the correct locations
grep -r "ANTHROPIC_API_KEY" . --exclude-dir=node_modules --exclude-dir=.git
# Expected: only two lines:
#   .env.local:ANTHROPIC_API_KEY=...
#   app/api/chat/route.ts:... (the process.env.ANTHROPIC_API_KEY access, if any)
# FAIL if it appears in any component, any prompt file, or any KB file

# 4. .env.local was never committed (R5 final check)
git log --all -- .env.local
# Expected: no output (completely empty — file was never staged or committed)
```

All four must pass. If check 4 returns any output, the API key has been committed at
some point — this is a critical security failure. Rotate the Anthropic API key immediately
before continuing.

---

### Task 6.3 — Commit all production-ready code to Git

**Files involved:**
- All project files excluding `.env.local` and `node_modules`
- `/.gitignore` (ensures exclusions are respected)

**Required input:**
- Task 6.2 complete (all four audit checks passed)

**Expected output:**
A clean Git commit containing all Sprint 1–6 code, with `.env.local` confirmed absent
from the commit.

**Success criterion:**
Run:
```bash
git add .
git status
```
In the output, confirm:
- `.env.local` does NOT appear under "Changes to be committed" ✓
- `node_modules/` does NOT appear (excluded by `.gitignore`) ✓
- All project files (`app/`, `lib/`, `prompts/`, `knowledge-base/`, `next.config.js`,
  `package.json`, `.cursorrules`, `*.md`) appear under "Changes to be committed" ✓

Then commit:
```bash
git commit -m "feat: BIXBG multi-agent chatbot — Sprints 1-6 complete"
```

Confirm commit was created:
```bash
git log --oneline -1
# Expected: shows the commit hash and the message above
```

---

### Task 6.4 — Push code to the GitHub remote repository

**Files involved:**
- Remote GitHub repository (created on github.com before this task)

**Required input:**
- Task 6.3 complete (commit exists)
- A GitHub account and a new empty repository created at `github.com` (prerequisite:
  create the repo at github.com → New Repository → name it `chatbot-bixbg` → Do NOT
  initialize with README, .gitignore, or license — keep it empty)

**Expected output:**
The committed code is pushed to GitHub and visible at `https://github.com/{username}/chatbot-bixbg`.

**Success criterion:**
```bash
# Add the GitHub remote (replace {username} with your GitHub username)
git remote add origin https://github.com/{username}/chatbot-bixbg.git

# Push
git push -u origin main
```

Open `https://github.com/{username}/chatbot-bixbg` in a browser.
The repository must show the project files (`app/`, `lib/`, `knowledge-base/`, etc.).
`.env.local` must NOT appear in the file list on GitHub.

---

### Task 6.5 — Create the Vercel project linked to the GitHub repository

**Files involved:**
- Vercel dashboard at `vercel.com` (browser — no local files)

**Required input:**
- Task 6.4 complete (code is on GitHub)
- A Vercel account (free tier is sufficient)

**Expected output:**
A Vercel project exists, linked to the GitHub repo, with Next.js as the detected
framework. **Do NOT allow the automatic first deployment to complete yet** — it will
fail without the environment variable. Cancel it if it starts automatically.

**Success criterion:**
1. Go to `vercel.com` → "Add New Project" → "Import Git Repository"
2. Select `chatbot-bixbg` from the GitHub list
3. Vercel auto-detects **Next.js** as the framework — confirm this
4. Build command: `npm run build` (default — do not change)
5. Output directory: `.next` (default — do not change)
6. Root directory: `./` (default — do not change)
7. Click "Deploy" — then **immediately click "Cancel Deployment"** before it runs
8. The project now exists at `vercel.com/dashboard` under your account

Confirm: the Vercel project page loads and shows "Framework: Next.js" in the project settings.

---

### Task 6.6 — Add `ANTHROPIC_API_KEY` to Vercel Production Environment Variables

**Files involved:**
- Vercel dashboard → Project Settings → Environment Variables (browser)

**Required input:**
- Task 6.5 complete (Vercel project exists)

**Expected output:**
`ANTHROPIC_API_KEY` is set as a production environment variable in the Vercel project,
with the real API key value (not the `.env.local` placeholder).

**Success criterion:**
1. In the Vercel project dashboard, go to **Settings → Environment Variables**
2. Click **Add New**
3. Set:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** your real Anthropic API key (starts with `sk-ant-`)
   - **Environment:** check `Production` (check `Preview` and `Development` too — optional)
4. Click **Save**

Confirm: the environment variable appears in the list with name `ANTHROPIC_API_KEY`
and the value shows as `***` (masked). The key value must NOT be visible in plain text
after saving — if it is, Vercel may have stored it incorrectly, retry.

---

### Task 6.7 — Trigger the production deployment and wait for a successful build

**Files involved:**
- Vercel dashboard → Deployments tab (browser)

**Required input:**
- Task 6.6 complete (env var set)

**Expected output:**
A successful production deployment at a public `.vercel.app` URL with a green
"Ready" status in the Vercel dashboard.

**Success criterion:**
1. In the Vercel project dashboard, click **"Redeploy"** (or trigger a new deployment
   by going to Deployments → Deploy)
2. Watch the build log in real time
3. The build must complete with:
   - Status: **"Ready"** (green) — not "Error" or "Building"
   - Zero build errors in the log
   - No lines containing "Error:" or "Failed"
4. A production URL appears in the format `https://{project-name}.vercel.app`

Copy the production URL — it is used in all subsequent tasks. If the build fails,
read the error in the build log and fix it before proceeding. Common causes: missing
`next.config.js` CommonJS syntax, TypeScript errors that `tsc --noEmit` missed, or
missing dependencies in `package.json`.

---

### Task 6.8 — Verify KB files are accessible in the production serverless function (RISK 2)

**Files involved:**
- Production URL (browser + Network tab)
- `/next.config.js` (conditionally modified if RISK 2 is triggered)

**Required input:**
- Task 6.7 complete (production URL exists)

**Expected output:**
Confirmed that the Knowledge Base `.md` files reach the Vercel serverless function
and that Compass references KB-specific content in its responses.

**Success criterion:**

**Primary test — functional KB probe:**
Open the production URL in a browser. Send this message to Compass:
> `"Hai esempi di esperienze già realizzate da BIXBG?"`

Compass must reference at least one of these KB-specific terms in its response:
`"Pollica"`, `"Venezia"`, `"Future Food Institute"`, `"Good Eye"`, `"dieta mediterranea"`

If Compass responds with these terms → KB files are reaching the function ✓ — proceed to Task 6.9.

**If Compass does NOT reference any KB-specific terms** → RISK 2 is triggered.
Apply the secondary mitigation:
1. Open `/next.config.js` and add `output: 'standalone'` to the config:
   ```js
   const nextConfig = {
     output: 'standalone',
     experimental: {
       outputFileTracingIncludes: {
         '/api/chat': ['./knowledge-base/**/*.md'],
       },
     },
   };
   ```
2. Commit and push: `git add next.config.js && git commit -m "fix: standalone output for KB file tracing" && git push`
3. Wait for Vercel to auto-redeploy (triggered by the push)
4. Re-run the KB probe test above

The test must pass after the secondary mitigation. If it still fails, check the Vercel
build log for the string `knowledge-base` — if no traces appear, contact the Vercel
support documentation on `outputFileTracingIncludes`.

---

### Task 6.9 — Verify the API key is not present in any committed or public file (R5 final)

**Files involved:**
- Local terminal (git audit)
- GitHub repository page (visual scan)

**Required input:**
- Task 6.7 complete

**Expected output:**
Confirmed proof that the Anthropic API key exists only in the Vercel dashboard
environment variables, nowhere else.

**Success criterion:**

```bash
# 1. Key never committed to Git history
git log --all -- .env.local
# Expected: no output

# 2. Key not in any tracked file
git grep "sk-ant-" 2>/dev/null || echo "No API key found in tracked files"
# Expected: "No API key found in tracked files"

# 3. Key not in any local project file (broader scan)
grep -r "sk-ant-" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null \
  || echo "No API key found"
# Expected: "No API key found"
```

Then open `https://github.com/{username}/chatbot-bixbg` in a browser.
Search for `sk-ant-` using GitHub's file search (top search bar → type in the repo).
Expected: zero results. If any result appears → the API key is public and must be
rotated immediately on the Anthropic dashboard before anything else.

---

### Task 6.10 — Verify streaming works on the production URL (R4)

**Files involved:**
- Production URL (browser DevTools → Network tab)

**Required input:**
- Task 6.8 complete (KB access confirmed)

**Expected output:**
Confirmed that the production deployment uses streaming (not bulk JSON responses)
for Compass responses, identical to local dev behavior.

**Success criterion:**
1. Open the production URL in Chrome or Firefox
2. Open **DevTools → Network tab → Fetch/XHR**
3. Send a message in the chat UI
4. Click the `chat` request in the Network tab
5. Check the **Response Headers**:
   - `x-agent: compass` must appear ✓
   - `x-agent-color: #6475FA` must appear ✓
6. Check the response body (EventStream tab or Response tab):
   - Multiple data chunks must appear (lines starting with `0:"`)
   - NOT a single JSON object ✓
7. In the browser chat UI:
   - Words must appear progressively during streaming ✓
   - NOT appearing all at once after a delay ✓

If the response appears in bulk (all at once) on the production URL but streamed locally:
- Check that `toDataStreamResponse()` is called in route.ts (not `NextResponse.json`)
- Check Vercel function logs for any streaming errors (Vercel dashboard → Functions tab)

---

### Task 6.11 — Verify no 504 Gateway Timeout errors during a full conversation (R3)

**Files involved:**
- Production URL (browser)
- Vercel dashboard → Functions log (observe)

**Required input:**
- Task 6.10 complete (streaming confirmed)

**Expected output:**
Confirmed that the `maxDuration = 30` export in route.ts prevents 504 timeout errors
during the two-LLM-call pipeline on Vercel's free tier.

**Success criterion:**
On the production URL, complete this 4-message conversation (each message exercises
the full Manager → Specialist pipeline):

1. Send: `"Ho un'idea per un'esperienza a Venezia con giovani professionisti"`
   - Wait for Compass response to fully stream ✓
   - No 504 error visible in browser or terminal ✓

2. Send: `"Il tema è la fuga dei giovani, 4 giorni, 12 persone, early stage"`
   - Wait for Compass response ✓
   - No 504 error ✓

3. Send: `"procedi"` (triggers Manager to route to Architect)
   - Wait for Architect response to stream ✓
   - Badge switches to orange ✓
   - No 504 error ✓

4. Send: `"chi potrebbe sponsorizzare questa esperienza?"` (triggers Bridge)
   - Wait for Bridge response to stream ✓
   - Badge switches to green ✓
   - No 504 error ✓

All four responses must complete without the browser showing a network error (red in
the Network tab) or the page displaying an error state. If a 504 occurs, confirm
`export const maxDuration = 30` exists in `route.ts` and that the file was committed
and redeployed after Task 6.1.

---

### Task 6.12 — Run the complete Compass → Architect → Bridge flow on the production URL

**Files involved:**
- Production URL (browser — full manual test)

**Required input:**
- Task 6.11 complete (no timeouts confirmed)

**Expected output:**
Confirmed that the production deployment is functionally identical to local dev:
all three agents respond correctly, badges update, and streaming works end-to-end.

**Success criterion:**
Reload the production URL (fresh session). Complete this conversation:

| Step | Send | Expected |
|---|---|---|
| 1 | `"Ho un'idea per un'esperienza a Venezia: il tema è la fuga dei giovani, partecipanti in transizione, 4 giorni, 12 persone, early stage"` | Compass responds in Italian, asks a follow-up question, badge is violet |
| 2 | `"Il luogo è Venezia perché incarna la perdita. Il bisogno è capire cosa significa restare."` | Compass produces `profile` block, asks whether to structure or find partners |
| 3 | `"procedi"` | Badge switches to orange, Architect responds with a narrative arc |
| 4 | `"chi sono i partner ideali?"` | Badge switches to green, Bridge responds with partner categories and pitch text |

For each step, confirm:
- Response is in **Italian** ✓
- Badge color matches the active agent ✓
- No `"Compass"`, `"Architect"`, `"Bridge"` in the response text ✓
- Streaming is visible (words appear progressively) ✓
- No console errors in DevTools ✓

All 20 checks (5 per step × 4 steps) must pass.

---

### Task 6.13 — Record the production URL and document the public-access security limitation

**Files involved:**
- `/README.md` (create new — a simple one-page project summary)

**Required input:**
- Task 6.12 complete (production deployment fully verified)

**Expected output:**
A `README.md` at the project root that records the production URL and explicitly
communicates the public-access limitation so Matteo acts before sharing the link.

Exact file content:
```markdown
# BIXBG Chatbot

**Strumento interno per Belle idee x Bella gente.**
Qualify, structure, and find partners for BIXBG experiences through an AI-powered chatbot.

## Production URL
https://{your-project-name}.vercel.app

## Agents
| Agent | Role | Color |
|---|---|---|
| BIXBG Compass | Qualifies the experience idea | #6475FA (violet) |
| BIXBG Architect | Structures the creative experience | #E8650A (orange) |
| BIXBG Bridge | Identifies partners and builds pitches | #22C55E (green) |

## Stack
Next.js · React · Tailwind CSS · Vercel AI SDK · Claude API · Vercel

## ⚠️ Security Notice Before Sharing the URL

The deployed URL is **publicly accessible** — no authentication is required.
Anyone with the link can use the chatbot and consume your Anthropic API credits.

**Before sharing the URL, do this:**
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Set a **monthly spending cap** on your account
3. Only share the URL with people you trust

This is a deliberate architectural choice (no auth, per project spec).
No authentication will be added.

## Local Development
\`\`\`bash
npm install
# Add your ANTHROPIC_API_KEY to .env.local
npm run dev
\`\`\`
```

Replace `{your-project-name}` with the actual Vercel subdomain.

**Success criterion:**
```bash
git add README.md
git commit -m "docs: add README with production URL and security notice"
git push
```

Open `https://github.com/{username}/chatbot-bixbg` — the README must render on the
repository homepage with the correct production URL and the ⚠️ security notice visible.
The Vercel dashboard must show a new deployment triggered by this commit (or trigger one manually).

---

## Sprint 6 — Completion Checklist

Before marking the project as complete, confirm every item:

**Pre-deploy:**
- [ ] `export const maxDuration = 30` is in `route.ts` (R3 mitigation)
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `git status` confirms `.env.local` is untracked
- [ ] `git log --all -- .env.local` returns empty (key never committed)
- [ ] `grep -r "sk-ant-" .` returns no results in tracked files

**Deployment:**
- [ ] Code committed and pushed to GitHub
- [ ] Vercel project created, linked to GitHub repo
- [ ] `ANTHROPIC_API_KEY` set in Vercel Environment Variables (Production)
- [ ] Build completed with "Ready" status and zero build errors

**Production verification:**
- [ ] KB probe: Compass references Pollica, Venezia, or other KB-specific terms (RISK 2)
- [ ] `x-agent: compass` header visible in Network tab on production URL
- [ ] Streaming confirmed in Network tab (progressive chunks, not single JSON)
- [ ] Full 4-message conversation completes without 504 errors (R3)
- [ ] Full Compass → Architect → Bridge flow verified on production URL (Task 6.12)
- [ ] No forbidden agent names in response bubbles on production
- [ ] `.env.local` not visible on GitHub repository file list (R5)

**Documentation:**
- [ ] `README.md` created with production URL and ⚠️ public-access security warning
- [ ] Spending cap set on Anthropic account before URL is shared with anyone
```
