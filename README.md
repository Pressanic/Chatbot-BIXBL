# BIXBG Chatbot

**Strumento interno per Belle idee x Bella gente.**
Qualify, structure, and find partners for BIXBG experiences through an AI-powered chatbot.

## Production URL
https://chatbot-bixbl-xi.vercel.app

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
```bash
npm install
# Add your ANTHROPIC_API_KEY to .env.local
npm run dev
```
