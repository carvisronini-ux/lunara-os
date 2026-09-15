# Lunara OS Foundation v1.0

> **Status:** Final Foundation Baseline  
> **Product:** Lunara Telegram Mini App  
> **Development:** GitHub → StackBlitz → Vercel → Supabase OS  
> **Workflow Engine:** Proprietary Lunara OS runtime (NO n8n)

## Core Principles
1. Lunara App (Product) and Lunara OS (Operations) are strictly decoupled.
2. No n8n dependency. Orchestration is native code.
3. Supabase OS is for relational state, tasks, events, and audit. NOT large media.
4. Large media is handled via the Provider-Agnostic Asset Service.
5. Agents are software entities with strict contracts, permissions, and measurable responsibilities.

## Directory Structure
- `app/`: Next.js App Router pages (Dashboard, Virtual Office, etc.)
- `core/`: Universal contracts, event bus, task engine, policy engine.
- `services/`: External integrations (Assets, Credentials, Providers).
- `agents/`: Individual agent logic and constitutions.
- `supabase/`: Database migrations, edge functions, and seed data.

## Getting Started
1. Copy `.env.example` to `.env.local` and fill in your StackBlitz/Supabase OS credentials.
2. Run `npm install`
3. Run `npm run dev`