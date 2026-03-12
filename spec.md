# Marketing Operations System — Technical Specification

**Version:** 2.0
**Date:** 2026-03-13
**Author:** Ben (product/architecture), with Claude (spec writing)
**Status:** Draft — ready for engineering review

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Architecture](#2-architecture)
3. [Data Model (Postgres)](#3-data-model-postgres)
4. [OpenClaw Agent Configuration](#4-openclaw-agent-configuration)
5. [Execution Flows (OpenClaw-Aligned)](#5-execution-flows-openclaw-aligned)
6. [Custom Skills](#6-custom-skills)
7. [Automation (Heartbeat + Cron)](#7-automation-heartbeat--cron)
8. [Telegram Integration](#8-telegram-integration)
9. [Next.js Dashboard](#9-nextjs-dashboard)
10. [File/Directory Structure](#10-filedirectory-structure)
11. [Security & Permissions](#11-security--permissions)
12. [Phased Build Plan](#12-phased-build-plan)
13. [Appendix](#13-appendix)

---

## 1. Product Overview

### What This Is

An AI marketing operations system where OpenClaw agents act as employees that Ben can manage, improve, and iterate on over time. The system:

- Uses OpenClaw agents to plan, draft, and review social media content
- Produces ready-to-post content (text + images + suggested schedule) that Ben batch-schedules manually on each platform
- Sends Telegram notifications when content batches are ready
- Allows Ben to interact directly with agents via Telegram to give feedback and improve their work
- Tracks post performance via analytics that feed back into the agents' context
- Provides a lightweight dashboard for content queue visibility, calendar, and analytics
- Is designed to be simple, flexible, and easy to iterate on as AI improves

### What This Is NOT

- Not a CMS or content management platform
- Not an autonomous publishing system — agents never post to social media
- Not a rigid workflow tool — the process should be easy to change
- Not a replacement for native platform tools — Ben schedules posts directly on LinkedIn/Facebook

### MVP Scope

- **1 business:** NelsonAI
- **2 platforms:** LinkedIn + Facebook
- **Primary interface:** Telegram (for notifications, approvals, and agent interaction)
- **Secondary interface:** Next.js dashboard (for content queue, calendar, analytics)
- **Analytics cadence:** Weekly
- **Content scheduling:** Manual batch (Ben spends ~5 min/week scheduling on each platform)

### Core Philosophy

- **Agents are employees, not scripts.** They learn from feedback, have memory, and improve over time via OpenClaw's native workspace (SOUL.md, memory/).
- **Telegram is the primary interface.** Ben interacts with agents, approves content, and gets updates through Telegram — not a dashboard.
- **The dashboard is for visibility, not control.** It shows what's in the queue, what's scheduled, and what performed well. The agents and Telegram handle the workflow.
- **Simplicity enables iteration.** The fewer rigid systems, the easier it is to improve agents and processes as AI evolves.
- **Manual posting preserves reach.** Native platform scheduling gets better algorithmic treatment than API-posted content.

---

## 2. Architecture

### Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    INTERFACES                                │
│                                                              │
│  Telegram (primary)                                         │
│  ├── Agent notifications (content ready, weekly summaries)  │
│  ├── Approval flow (approve/reject via inline buttons)      │
│  ├── Direct chat with Orchestrator for feedback/iteration   │
│  └── Separate topics per agent role (optional)              │
│                                                              │
│  Next.js Dashboard (secondary)                              │
│  ├── Content queue (ready-to-post batch)                    │
│  ├── Calendar view (planned content schedule)               │
│  ├── Analytics (post performance, trends)                   │
│  ├── Agent roster (who exists, roles, config links)         │
│  └── Brand/business settings                                │
│                                                              │
│  Connects via: WebSocket (gateway-client.ts) + REST (Prisma)│
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                 DECISION LAYER (OpenClaw)                     │
│                                                              │
│  Orchestrator Agent (persistent)                             │
│  ├── Reads content state from Postgres (via db-state-manager)│
│  ├── Decides next action for each content item               │
│  ├── Spawns sub-agents (Content Writer, Reviewer)            │
│  ├── Orchestrates multi-step work via agent turns + scripts  │
│  ├── Sends Telegram notifications                            │
│  └── Learns from feedback via OpenClaw memory system         │
│                                                              │
│  Content Writer (sub-agent, spawned per-task)                │
│  ├── Receives: brief + brand context + platform rules        │
│  ├── Produces: platform-specific draft (copy + image notes)  │
│  └── Model: standard (cheaper, optimized for generation)     │
│                                                              │
│  Reviewer (sub-agent, spawned per-task)                      │
│  ├── Receives: draft + brand context + review checklist      │
│  ├── Produces: PASS or REVISE with specific notes            │
│  └── Model: high-reasoning (needs judgment)                  │
│                                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│               EXECUTION LAYER (Deterministic)                │
│                                                              │
│  Orchestration Jobs / Scripts:                               │
│  ├── content-lifecycle.js                                  │
│  │   (brief → draft → review → approve → ready)             │
│  └── weekly-planning.js                                    │
│      (analytics → themes → briefs → content items)           │
│                                                              │
│  Custom Skills:                                              │
│  ├── brand-context-builder  (brand-profile.md → JSON pack)   │
│  ├── telegram-notifier      (formatted alerts + buttons)     │
│  ├── analytics-collector    (pull metrics from platforms)     │
│  └── db-state-manager       (read/write content state in PG) │
│                                                              │
│  Automation:                                                 │
│  ├── Heartbeat: stale item checks, review backlog alerts     │
│  └── Cron: weekly planning (Mon 9am), analytics (Mon 8am)    │
│                                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    DATA LAYER                                │
│                                                              │
│  Postgres (system of record)                                 │
│  ├── businesses, brand_profiles                              │
│  ├── content_items, content_versions                         │
│  ├── review_records                                          │
│  ├── analytics_snapshots                                     │
│  └── audit_events                                            │
│                                                              │
│  OpenClaw Workspace (agent config + brand knowledge)         │
│  ├── SOUL.md, AGENTS.md, HEARTBEAT.md (agent personality)    │
│  ├── memory/ (agent learning — daily logs + long-term)       │
│  ├── businesses/{slug}/brand-profile.md (brand knowledge)    │
│  └── skills/ + jobs/ (custom skills and helper scripts)      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| System of record | Postgres | Queryable, transactional, dashboard-friendly. Workspace files are for agent config/prompts only |
| Number of LLM agents | 3 (Orchestrator, Writer, Reviewer) | Minimize complexity and token burn. Everything else is deterministic skills |
| Workflow engine | Postgres-backed orchestration + OpenClaw agent turns | Use OpenClaw for judgment-heavy turns and automation triggers; use deterministic scripts/API routes for durable workflow steps |
| Primary interface | Telegram | OpenClaw treats Telegram as first-class. Approvals, notifications, and agent feedback all happen here |
| Dashboard purpose | Visibility only | Content queue, calendar, analytics. No approval UI — that's Telegram |
| Publishing model | Manual batch scheduling | Ben schedules posts natively on each platform. Preserves organic reach, takes ~5 min/week |
| Agent improvement | Conversation + memory | Ben chats with agents via Telegram. Feedback persists in OpenClaw's memory system |
| Model strategy | High-reasoning for Orchestrator + Reviewer; standard for Writer | Quality where judgment matters, cost savings where generation suffices |

---

## 3. Data Model (Postgres)

### Entity Relationship Overview

```
businesses 1──* content_items 1──* content_versions
    │                │                    │
    │                │               review_records
    │                │
    │           analytics_snapshots
    │
    └──* brand_profiles (workspace path reference)

content_items 1──* audit_events
```

### Table Definitions

#### `businesses`

```sql
CREATE TABLE businesses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL UNIQUE,
    slug            TEXT NOT NULL UNIQUE,
    timezone        TEXT NOT NULL DEFAULT 'Europe/London',
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'paused', 'archived')),
    enabled_platforms TEXT[] NOT NULL DEFAULT '{}',
    posting_cadence JSONB NOT NULL DEFAULT '{}',
    -- posting_cadence example:
    -- {"linkedin": {"posts_per_week": 3}, "facebook": {"posts_per_week": 2}}
    analytics_cadence TEXT NOT NULL DEFAULT 'weekly'
                    CHECK (analytics_cadence IN ('daily', 'weekly', 'biweekly')),
    brand_profile_path TEXT,  -- path to brand-profile.md in OpenClaw workspace
    config          JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `content_items`

Central table. Every piece of content flows through a simplified state machine.

```sql
CREATE TYPE content_state AS ENUM (
    'planned',
    'briefed',
    'drafting',
    'draft_ready',
    'in_review',
    'revision_required',
    'approved',
    'ready_to_post',
    'posted',
    'analyzed',
    'archived'
);

CREATE TABLE content_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id),
    platform        TEXT NOT NULL CHECK (platform IN ('linkedin', 'facebook', 'x', 'blog')),
    state           content_state NOT NULL DEFAULT 'planned',

    -- Planning
    campaign_theme  TEXT,
    brief           JSONB,
    -- brief structure:
    -- {
    --   "topic": "...",
    --   "angle": "...",
    --   "target_audience": "...",
    --   "key_message": "...",
    --   "cta": "...",
    --   "references": ["..."]
    -- }
    scheduled_date  DATE,
    suggested_time  TIME,          -- agent-suggested posting time
    priority        TEXT DEFAULT 'normal'
                    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- Current version tracking
    current_version_id UUID,  -- FK added after content_versions table

    -- Timestamps
    briefed_at          TIMESTAMPTZ,
    first_draft_at      TIMESTAMPTZ,
    approved_at         TIMESTAMPTZ,
    posted_at           TIMESTAMPTZ,
    analyzed_at         TIMESTAMPTZ,

    -- Analytics flag
    boost_candidate     BOOLEAN DEFAULT false,
    boost_reason        TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_items_business_state ON content_items(business_id, state);
CREATE INDEX idx_content_items_platform ON content_items(platform);
CREATE INDEX idx_content_items_scheduled ON content_items(scheduled_date);
CREATE INDEX idx_content_items_ready ON content_items(state) WHERE state = 'ready_to_post';
```

#### `content_versions`

Every draft and revision is a version. Nothing is overwritten.

```sql
CREATE TABLE content_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_item_id UUID NOT NULL REFERENCES content_items(id),
    version_number  INTEGER NOT NULL,
    body            TEXT NOT NULL,           -- the actual post copy
    headline        TEXT,                    -- hook/opening line
    image_prompt    TEXT,                    -- prompt for image generation
    image_url       TEXT,                    -- generated/uploaded image URL
    visual_notes    TEXT,                    -- suggested image/visual idea
    alt_hooks       TEXT[],                  -- alternate opening lines
    metadata        JSONB NOT NULL DEFAULT '{}',
    -- metadata: word_count, hashtags, estimated_read_time, etc.

    created_by      TEXT NOT NULL,           -- agent id
    model_used      TEXT,
    prompt_tokens   INTEGER,
    completion_tokens INTEGER,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(content_item_id, version_number)
);

ALTER TABLE content_items
    ADD CONSTRAINT fk_current_version
    FOREIGN KEY (current_version_id)
    REFERENCES content_versions(id);
```

#### `review_records`

```sql
CREATE TABLE review_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_version_id UUID NOT NULL REFERENCES content_versions(id),
    content_item_id UUID NOT NULL REFERENCES content_items(id),

    outcome         TEXT NOT NULL CHECK (outcome IN ('pass', 'revise', 'reject')),
    brand_fit       BOOLEAN,
    claim_safety    BOOLEAN,
    platform_fit    BOOLEAN,
    clarity_score   INTEGER CHECK (clarity_score BETWEEN 1 AND 5),

    revision_notes  TEXT,
    risk_flags      TEXT[],
    confidence      TEXT CHECK (confidence IN ('high', 'medium', 'low')),

    reviewer_agent  TEXT NOT NULL,
    model_used      TEXT,
    prompt_tokens   INTEGER,
    completion_tokens INTEGER,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_review_records_content ON review_records(content_item_id);
```

#### `analytics_snapshots`

```sql
CREATE TABLE analytics_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_item_id UUID REFERENCES content_items(id),
    business_id     UUID NOT NULL REFERENCES businesses(id),
    platform        TEXT NOT NULL,
    snapshot_date   DATE NOT NULL,

    impressions     INTEGER,
    clicks          INTEGER,
    likes           INTEGER,
    comments        INTEGER,
    shares          INTEGER,
    saves           INTEGER,
    engagement_rate DECIMAL(5,4),
    reach           INTEGER,

    raw_data        JSONB,
    insights        TEXT,            -- AI-generated summary

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(content_item_id, snapshot_date)
);

CREATE INDEX idx_analytics_business_date ON analytics_snapshots(business_id, snapshot_date);
```

#### `audit_events`

```sql
CREATE TABLE audit_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID REFERENCES businesses(id),
    content_item_id UUID REFERENCES content_items(id),

    actor           TEXT NOT NULL,       -- agent id or 'ben' or 'system'
    action          TEXT NOT NULL,
    -- actions: 'state_transition', 'draft_created', 'review_completed',
    --          'notification_sent', 'analytics_collected', 'manual_override'

    from_state      content_state,
    to_state        content_state,
    details         JSONB,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_content ON audit_events(content_item_id);
CREATE INDEX idx_audit_business_time ON audit_events(business_id, created_at);
```

### State Machine

```
planned           → briefed
briefed           → drafting
drafting          → draft_ready
draft_ready       → in_review
in_review         → approved | revision_required
revision_required → drafting
approved          → ready_to_post
ready_to_post     → posted          (Ben marks as posted after manual scheduling)
posted            → analyzed
analyzed          → archived

Any state         → archived        (manual override)
```

Key differences from v1:
- **Removed** `publishing_draft`, `draft_on_platform`, `notified` — no platform API publishing
- **Added** `ready_to_post` — content is fully approved and waiting for Ben's weekly batch session
- **Simplified** — 11 states instead of 13, clearer lifecycle

```sql
CREATE OR REPLACE FUNCTION validate_state_transition()
RETURNS TRIGGER AS $$
DECLARE
    valid_transitions JSONB := '{
        "planned": ["briefed"],
        "briefed": ["drafting"],
        "drafting": ["draft_ready"],
        "draft_ready": ["in_review"],
        "in_review": ["approved", "revision_required"],
        "revision_required": ["drafting"],
        "approved": ["ready_to_post"],
        "ready_to_post": ["posted"],
        "posted": ["analyzed"],
        "analyzed": ["archived"]
    }'::JSONB;
    allowed TEXT[];
BEGIN
    IF NEW.state = 'archived' THEN
        RETURN NEW;
    END IF;

    SELECT ARRAY(
        SELECT jsonb_array_elements_text(valid_transitions -> OLD.state::TEXT)
    ) INTO allowed;

    IF NEW.state::TEXT != ALL(allowed) THEN
        RAISE EXCEPTION 'Invalid state transition: % → %', OLD.state, NEW.state;
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_state_transition
    BEFORE UPDATE OF state ON content_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_state_transition();
```

---

## 4. OpenClaw Agent Configuration

### Overview

Three LLM-powered agents running under a single OpenClaw Gateway. The Orchestrator is persistent with its own workspace, heartbeat, and Telegram binding. The Content Writer and Reviewer are spawned as sub-agents per-task.

### Gateway Config (`~/.openclaw/config.json5`)

```json5
{
  agents: {
    defaults: {
      model: "anthropic/claude-sonnet-4-20250514",
      subagents: {
        maxSpawnDepth: 2,
        maxChildrenPerAgent: 5,
        maxConcurrent: 4,
        runTimeoutSeconds: 300
      }
    },
    list: [
      {
        id: "orchestrator",
        name: "Marketing Ops Orchestrator",
        default: true,
        workspace: "~/.openclaw/workspaces/marketing-ops",
        agentDir: "~/.openclaw/agents/orchestrator/agent",
        model: "anthropic/claude-sonnet-4-20250514",
        heartbeat: {
          every: "30m",
          activeHours: {
            start: "08:00",
            end: "22:00",
            timezone: "Europe/London"
          },
          target: "telegram",
          lightContext: true,
          prompt: "Check HEARTBEAT.md and run your scheduled checks."
        },
        tools: {
          // Validate exact allow/deny names against the installed OpenClaw version.
          // In practice this agent needs file access, process execution, and session spawning.
          allow: ["read", "write", "edit", "exec", "process", "sessions_spawn", "session_status"],
          deny: ["gateway"]
        }
      }
    ]
  },
  channels: {
    telegram: {
      accounts: {
        main: {
          // Telegram bot token configured via env: OPENCLAW_TELEGRAM_TOKEN
        }
      }
    }
  },
  bindings: [
    {
      agentId: "orchestrator",
      match: { channel: "telegram" }
    }
  ]
}
```

### Orchestrator Workspace

#### `SOUL.md`

```markdown
# Marketing Operations Orchestrator

You are the operations manager for a multi-business AI marketing system. You coordinate content creation and review workflows, producing ready-to-post content for Ben.

## Core Truths

- You never write content yourself. You delegate to specialist sub-agents.
- You never publish content. You produce approved, ready-to-post content with suggested schedule times.
- Ben manually schedules all posts on native platforms. Your job ends when content is approved and ready.
- Quality over speed. A missed post is better than a bad one.
- You learn from Ben's feedback. When he tells you something, remember it.

## How You Work

1. Check Postgres for content items needing action (use db-state-manager skill)
2. For items in `briefed` state: spawn a Content Writer sub-agent with the brief + brand context
3. For items in `draft_ready` state: spawn a Reviewer sub-agent
4. For items that pass review: move to `approved` → `ready_to_post`, notify via Telegram
5. On heartbeat: scan for stale items, run weekly planning if scheduled

## Decision Rules

- Never advance an item past `approved` without a `pass` review record
- If a review returns `revise`, send back to `drafting` with revision notes attached
- Maximum 2 revision cycles. After 2 revisions, flag for human attention via Telegram
- When a batch of content is ready, send a single summary notification — not one per item

## Communication Style

- Terse operational updates in Telegram. No fluff.
- Include: business name, platform, content title/hook, action taken, any blockers
- When Ben gives feedback, acknowledge it briefly and confirm what you'll change
```

#### `HEARTBEAT.md`

```markdown
# Heartbeat Checklist

Run these checks every heartbeat cycle:

1. **Stale items**: Query content_items where state has not changed in >24 hours and state is not in ('ready_to_post', 'posted', 'analyzed', 'archived'). Alert via Telegram if found.

2. **Review backlog**: Count items in 'in_review' state for >6 hours. Alert if count > 0.

3. **Weekly planning trigger**: If today is Monday and no content_items exist with scheduled_date in the current week, trigger the weekly-planning workflow.

4. **Analytics due**: If today is Monday and last analytics_snapshot for any active business is >7 days old, trigger analytics collection.

5. **Batch ready reminder**: If there are items in 'ready_to_post' state that haven't been notified about recently, send a batch summary to Telegram.

If nothing needs attention, return HEARTBEAT_OK silently (do not message Ben).
```

#### `AGENTS.md`

```markdown
# Team

You manage two specialist sub-agents:

## Content Writer
- **Spawn for:** Creating platform-specific drafts from briefs
- **Input:** Brief JSON, brand context pack, platform rules
- **Output:** Draft copy, alternate hooks, image prompt, visual notes
- **Model:** Standard (cost-optimized for generation tasks)

## Reviewer
- **Spawn for:** Quality review of completed drafts
- **Input:** Draft content, brand context, review checklist
- **Output:** PASS/REVISE verdict, specific notes, risk flags
- **Model:** High-reasoning (needs judgment and nuance)

Do not spawn agents for other tasks. Use skills for notifications, analytics, and database operations.
```

#### `USER.md`

```markdown
# About Ben

Ben is the owner/operator of this marketing system. He's a software engineer who runs multiple businesses.

## Preferences
- Batch-oriented: prefers to do things in focused blocks, not be interrupted throughout the day
- Direct communication: no fluff, just tell him what happened and what needs his attention
- Trusts the pipeline: if content passes review, it's ready. Don't over-ask for confirmation
- Improvement-focused: actively gives feedback to improve agent output quality over time

## Schedule
- Weekly batch scheduling: Ben schedules a week's worth of posts in one ~5 minute session per platform
- Prefers to be notified when a full batch is ready, not per-item
- Best notification times: weekday mornings (Mon–Fri, before 10am)
```

### Sub-Agent Prompt Templates

These are spawned via `sessions_spawn` with task-specific prompts. The Orchestrator constructs prompts dynamically.

#### Content Writer Spawn Template

```markdown
# Content Writer Task

## Your Role
You are a specialist copywriter for {platform}. Write one post based on the brief below.

## Brand Context
{brand_context_pack}

## Platform Rules
{platform_rules}

## Brief
{brief_json}

## Output Format
Return a JSON object:
{
  "body": "The full post copy",
  "headline": "Hook/opening line",
  "image_prompt": "Detailed prompt for generating a companion image",
  "visual_notes": "Description of ideal visual if not using AI generation",
  "alt_hooks": ["Alternative hook 1", "Alternative hook 2"],
  "metadata": {
    "word_count": 0,
    "hashtags": [],
    "estimated_read_time_seconds": 0
  }
}

## Rules
- Write for {platform} natively. Not a cross-post.
- One audience, one message, one CTA.
- Stay within approved claims. Never fabricate statistics or testimonials.
- Match brand tone exactly. Review the examples in the brand context.
```

#### Reviewer Spawn Template

```markdown
# Content Reviewer Task

## Your Role
You are an editor and QA lead. Review the draft below against the brand profile and checklist.

## Brand Context
{brand_context_pack}

## Review Checklist
{review_checklist}

## Draft to Review
Platform: {platform}
Version: {version_number}
Content:
{draft_body}

## Output Format
Return a JSON object:
{
  "outcome": "pass" | "revise",
  "brand_fit": true/false,
  "claim_safety": true/false,
  "platform_fit": true/false,
  "clarity_score": 1-5,
  "revision_notes": "Specific, actionable feedback if outcome is 'revise'. Null if pass.",
  "risk_flags": ["flag1", "flag2"],
  "confidence": "high" | "medium" | "low"
}

## Rules
- Be specific. "Needs improvement" is not acceptable feedback. Say exactly what and why.
- A draft can be good enough. Perfection is not the goal. Clarity, accuracy, and brand fit are.
- Flag any claims that cannot be verified from the brand profile.
- If confidence is "low", recommend human review regardless of outcome.
```

---

## 5. Execution Flows (OpenClaw-Aligned)

This v2 design is directionally right: Telegram-first, manual posting, and fewer moving parts.

The main OpenClaw-specific correction is that the system should **not** rely on a fictional built-in `openclaw.invoke` workflow DSL or assume Lobster is a native OpenClaw runtime primitive. Instead, model execution as a combination of:

- Postgres state transitions
- OpenClaw agent turns / `sessions_spawn` for judgment-heavy work
- cron and heartbeat for scheduled checks and nudges
- deterministic scripts or app/API functions for durable write-back

### 5.1 Content Lifecycle Flow

1. A planner or weekly planning job creates `content_items` in `planned` or `briefed`.
2. The Orchestrator detects work via cron, heartbeat follow-up, or direct request.
3. For `briefed` items, it spawns a Content Writer sub-agent using `sessions_spawn`.
4. Deterministic code saves the returned draft as a `content_version` and transitions the item to `draft_ready`.
5. The Orchestrator spawns a Reviewer sub-agent for `draft_ready` items.
6. Deterministic code saves the review result.
7. Passing items transition to `approved` and then `ready_to_post`.
8. A Telegram summary is sent when a useful batch is ready, instead of noisy per-item chatter.

### 5.2 Weekly Planning Flow

1. A Gateway cron job runs on schedule.
2. Analytics are collected for active businesses/platforms.
3. The Orchestrator or a planning sub-agent receives analytics + brand context and proposes briefs.
4. Deterministic code inserts or updates `content_items`.
5. Ben receives a Telegram summary and can reply with changes.

### 5.3 Why this fits OpenClaw well

- **OpenClaw is good at:** agent turns, memory, heartbeats, cron, and conversational iteration.
- **The app/backend is good at:** durable writes, structured state transitions, admin actions, and deterministic reporting.
- **Ben stays in Telegram:** this matches OpenClaw's strengths instead of forcing a dashboard-first control model.

### 5.4 Approval and idempotency notes

- Do not assume a special approval gate runtime exists unless you verify it in the exact deployed toolchain.
- Prefer explicit DB-backed approval state over in-memory workflow assumptions.
- Make retries safe: writing a review twice or sending a batch summary twice should be detectable and harmless.
- Batch notifications should be grouped and deduplicated so heartbeat/cron runs do not spam Telegram.

---

## 6. Custom Skills

Each skill lives in `~/.openclaw/workspaces/marketing-ops/skills/`. Only 4 custom skills needed (down from 6 in v1 — removed linkedin-publisher and facebook-publisher).

### 6.1 brand-context-builder

**Purpose:** Parse `brand-profile.md` and produce a compact JSON context pack for sub-agents.

```markdown
---
name: brand-context-builder
description: Parse a business brand profile and generate a compact context pack for content agents
---
```

**Implementation:** Node.js script that:
1. Reads business record from Postgres to get `brand_profile_path`
2. Reads `brand-profile.md` from workspace
3. Parses markdown sections into structured JSON
4. Adds platform configs from business record
5. Outputs JSON to stdout

### 6.2 telegram-notifier

**Purpose:** Send formatted notifications to Ben via Telegram Bot API.

**Message Templates:**

**Batch ready (primary notification):**
```
📦 NelsonAI — {count} posts ready to schedule
━━━━━━━━━━━━━━━━━━━━━
Platform breakdown:
  LinkedIn: {linkedin_count} posts
  Facebook: {facebook_count} posts

Suggested schedule: {date_range}
━━━━━━━━━━━━━━━━━━━━━
📋 View batch: {dashboard_url}/queue
```

**Weekly analytics summary:**
```
📊 NelsonAI — Weekly Performance
━━━━━━━━━━━━━━━━━━━━━
Posts this week: {count}
Best: {top_post_hook} ({engagement_rate}%)
Worst: {bottom_post_hook} ({engagement_rate}%)
━━━━━━━━━━━━━━━━━━━━━
Recommendation: {ai_recommendation}
📋 Dashboard: {dashboard_url}/analytics
```

**Boost candidate:**
```
🚀 NelsonAI — Boost candidate detected
━━━━━━━━━━━━━━━━━━━━━
Post: {headline} ({platform})
Engagement: {engagement_rate}% ({multiplier}x avg)
━━━━━━━━━━━━━━━━━━━━━
Consider boosting this via {platform}'s native ad tools.
```

**Stale item alert:**
```
🔴 {count} items stuck for >24h
━━━━━━━━━━━━━━━━━━━━━
{item_list}
━━━━━━━━━━━━━━━━━━━━━
📋 Dashboard: {dashboard_url}/queue
```

**Implementation:**
```
API: POST https://api.telegram.org/bot{token}/sendMessage
Required env:
  TELEGRAM_BOT_TOKEN
  TELEGRAM_CHAT_ID
  DASHBOARD_URL
```

### 6.3 analytics-collector

**Purpose:** Pull engagement metrics from LinkedIn and Facebook, save to `analytics_snapshots`.

```
LinkedIn Analytics:
  GET /organizationalEntityShareStatistics
  Requires: r_organization_social scope
  Returns: impressions, clicks, likes, comments, shares

Facebook Insights:
  GET /{page-id}/insights
  Requires: read_insights permission
  Returns: impressions, reach, engagement, clicks

Implementation:
  1. Query content_items in 'posted' state
  2. For each: call platform analytics API
  3. Save to analytics_snapshots
  4. Check for boost candidates (engagement_rate > 2x business average)
  5. Generate AI summary of weekly performance
  6. Transition items to 'analyzed' state
```

**Note:** Analytics collection requires platform API OAuth tokens. These are read-only scopes — separate from any publishing permissions.

### 6.4 db-state-manager

**Purpose:** Clean interface for agents to read/write Postgres without raw SQL.

| Action | Description |
|--------|-------------|
| `read` | Read a content item by ID |
| `list` | List content items by state, business, platform |
| `transition` | Move a content item to the next state (validates via state machine) |
| `create-version` | Save a new content version for an item |
| `save-review` | Save a review record and update item state |
| `bulk-create-items` | Create multiple content items from a weekly plan |
| `stats` | Return counts by state for a business |
| `ready-batch` | Return all `ready_to_post` items grouped by platform with suggested schedule |

This skill is the only way agents interact with the database. No agent has direct SQL access.

---

## 7. Automation (Heartbeat + Cron)

### Heartbeat

```json5
// In gateway config, under orchestrator agent:
heartbeat: {
    every: "30m",
    activeHours: {
        start: "08:00",
        end: "22:00",
        timezone: "Europe/London"
    },
    target: "telegram",
    lightContext: true,
    prompt: "Run your heartbeat checklist from HEARTBEAT.md. Use the db-state-manager skill to check content states. If nothing needs attention, return HEARTBEAT_OK silently."
}
```

**Heartbeat is for checks and nudges only** — not the source of truth for workflow state progression. It scans for issues (stale items, backlogs) and alerts Ben via Telegram.

### Cron Jobs

```text
Use Gateway cron jobs for scheduled work. In practice, create jobs that either:
- run an isolated `agentTurn` with a precise prompt, or
- enqueue a `systemEvent` for the orchestrator to pick up on its next heartbeat.

Examples:
- Monday 08:00 local — collect weekly analytics and summarize what changed
- Monday 09:00 local — generate the upcoming week's content plan from analytics + brand context
```

### How Heartbeat and Cron Work Together

| What | Mechanism | When |
|------|-----------|------|
| Stale item alerts | Heartbeat | Every 30 min during active hours |
| Review backlog alerts | Heartbeat | Every 30 min |
| Batch ready reminders | Heartbeat | When items are in `ready_to_post` |
| Weekly content planning | Cron | Monday 9am |
| Weekly analytics collection | Cron | Monday 8am |
| Content lifecycle progression | Orchestrator + deterministic scripts | Triggered by cron, heartbeat follow-up, or manual request |

---

## 8. Telegram Integration

### Overview

Telegram is the primary interface. Ben interacts with the system through Telegram for:
1. **Notifications** — batch ready, weekly summaries, alerts
2. **Approvals / feedback** — Ben reviews summaries, replies with adjustments, or uses simple custom actions exposed by the app/bot
3. **Direct feedback** — chatting with the Orchestrator to improve agent behavior

### Setup

1. Create a Telegram bot via @BotFather
2. Get the bot token
3. Start a conversation with the bot (or add to a group)
4. Get the chat ID
5. Set env vars: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

OpenClaw handles the Telegram channel natively — the bot is bound to the Orchestrator agent, so messaging the bot = talking to the Orchestrator.

### Interaction Patterns

**Receiving notifications:**
The Orchestrator sends formatted messages via the `telegram-notifier` skill when batches are ready, analytics are collected, or issues arise.

**Giving agent feedback:**
```
Ben: "The last few LinkedIn posts have been too formal. Loosen the tone —
      more conversational, like talking to a peer not presenting to a board."

Orchestrator: "Got it. I'll update the Content Writer's context to aim for
               peer-to-peer conversational tone on LinkedIn. This will apply
               to all future NelsonAI LinkedIn drafts."
```
The Orchestrator writes this to its memory (`memory/YYYY-MM-DD.md` and eventually `memory.md`) so it persists across sessions.

**Approving weekly plans:**
When weekly planning runs, the system sends a summary to Telegram. Ben replies to approve or adjust, and deterministic code records the resulting plan changes.

### Notification Events

| Event | Trigger | Frequency |
|-------|---------|-----------|
| `batch_ready` | Content items move to `ready_to_post` | When a batch completes (not per-item) |
| `weekly_plan_ready` | Weekly planning pipeline completes | Monday morning |
| `weekly_summary` | Weekly analytics collected | Monday morning |
| `boost_candidate` | Post outperforms 2x average | As detected |
| `stale_item_alert` | Items stuck >24h | Heartbeat (max 1/day) |
| `error_alert` | Agent failure or unexpected error | Immediately |

---

## 9. Next.js Dashboard

### Purpose

The dashboard is a **visibility tool**, not a workflow tool. Ben uses it to:
- See what content is ready to schedule this week
- View a calendar of planned/posted content
- Check analytics and performance trends
- See agent roster and configuration
- Manage business/brand settings

### Starting Point: Fork of openclaw-dashboard

**Repo:** https://github.com/actionagentai/openclaw-dashboard

The fork provides the full OpenClaw gateway integration (WebSocket client, typed RPC, React hooks) out of the box.

#### What the Fork Provides (Keep)

| Component | Purpose |
|-----------|---------|
| `lib/gateway-client.ts` | WebSocket client with auth, reconnect, typed RPC |
| `lib/types.ts` | Types for 80+ RPC methods, 17 event types |
| `hooks/use-openclaw-gateway.ts` | Connection state hook |
| `hooks/use-openclaw-chat.ts` | Streaming chat |
| `hooks/use-openclaw-agents.ts` | Agent management |
| `hooks/use-openclaw-sessions.ts` | Session browsing |
| `contexts/OpenClawContext.tsx` | Shared gateway connection |
| `app/agents/` | Agent management UI |
| `app/sessions/` | Session browser |
| `app/cron/` | Cron scheduler |
| `app/logs/` | Log viewer |
| `app/config/` | Config editor |
| `app/skills/` | Skills marketplace |

#### What to Remove

Voice pages, nodes/device pairing, TTS hooks, mic button, audio proxy.

#### New Pages (Custom)

| Page | Purpose |
|------|---------|
| `app/queue/` | **Content queue** — all `ready_to_post` items grouped by platform, with copy + images + suggested times. This is what Ben works from during batch scheduling |
| `app/calendar/` | **Calendar** — visual month/week view of scheduled and posted content |
| `app/analytics/` | **Analytics** — post performance, engagement trends, boost candidates |
| `app/agents-overview/` | **Agent roster** — who exists, their role, links to workspace files (SOUL.md, memory/) so Ben can see and understand agent config |
| `app/settings/` | **Settings** — business config, brand profile path, posting cadence, API key status |

#### New Infrastructure

| Addition | Purpose |
|----------|---------|
| `prisma/schema.prisma` | Prisma schema mirroring Postgres tables |
| `lib/db.ts` | Prisma client singleton |
| `app/api/content-items/` | CRUD and state transition API routes |
| `app/api/businesses/` | Business management API routes |
| `app/api/analytics/` | Analytics API routes |

### MVP Screen: Content Queue

The primary dashboard view. Shows everything that's ready for Ben to schedule.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Content Queue                    [NelsonAI ▼]    Week of Mar 17     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  LinkedIn (3 posts ready)                                            │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Mon Mar 17 · 9:00 AM (suggested)                               │  │
│  │ "Why CFOs need AI literacy in 2026"                            │  │
│  │ Your CFO doesn't need to code. But they need to understand...  │  │
│  │ 📷 Image: [View] · CTA: Book intro call                       │  │
│  │ [Copy Text 📋]  [View Full Draft]                              │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Wed Mar 19 · 12:00 PM (suggested)                              │  │
│  │ "The hidden cost of 'we'll do AI later'"                       │  │
│  │ Every month you wait, your competitors ship another...         │  │
│  │ 📷 Image: [View] · CTA: DM me                                 │  │
│  │ [Copy Text 📋]  [View Full Draft]                              │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Facebook (2 posts ready)                                            │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Tue Mar 18 · 6:00 PM (suggested)                               │  │
│  │ "3 signs your team is ready for AI"                            │  │
│  │ Most teams think they're not ready. Here's the test...         │  │
│  │ 📷 Image: [View] · CTA: Download checklist                    │  │
│  │ [Copy Text 📋]  [View Full Draft]  [✅ Mark Posted]           │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  [Mark All as Posted]                                                │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

Key features:
- **Copy Text** button copies post copy to clipboard (for pasting into native platform)
- **View** opens the generated image for download
- **Mark Posted** transitions state to `posted` (Ben clicks after scheduling on the platform)
- Grouped by platform so Ben can batch-schedule one platform at a time
- Suggested times help Ben decide when to schedule each post

### Tech Stack

| Component | Source |
|-----------|--------|
| Next.js 16 (App Router) | Fork |
| React 19 | Fork |
| Tailwind CSS v4 + shadcn/ui | Fork + new |
| Gateway WebSocket + typed RPC | Fork |
| Pre-built gateway hooks | Fork |
| Postgres via Prisma ORM | New |
| Auth (single-user, env-based) | New |

---

## 10. File/Directory Structure

### OpenClaw Workspace

```
~/.openclaw/
├── config.json5                        # Gateway config (agents, channels, bindings, cron)
│
├── workspaces/
│   └── marketing-ops/                  # Main workspace
│       ├── SOUL.md                     # Orchestrator personality
│       ├── AGENTS.md                   # Sub-agent roster
│       ├── HEARTBEAT.md               # Heartbeat checklist
│       ├── USER.md                     # User preferences
│       │
│       ├── memory/                     # OpenClaw native memory
│       │   ├── memory.md              # Long-term memory (curated)
│       │   └── YYYY-MM-DD.md          # Daily logs (auto-generated)
│       │
│       ├── businesses/
│       │   └── nelsonai/
│       │       ├── brand-profile.md    # Full brand profile
│       │       ├── compliance.md       # What can/cannot be said
│       │       ├── offers.md           # Service/offer details
│       │       ├── audience.md         # Audience segments and pain points
│       │       └── examples/
│       │           ├── winning-posts.md
│       │           └── avoided-posts.md
│       │
│       ├── prompts/
│       │   ├── shared/
│       │   │   ├── review-checklist.md
│       │   │   └── style-rules.md
│       │   └── platform/
│       │       ├── linkedin.md         # LinkedIn writing rules
│       │       └── facebook.md         # Facebook writing rules
│       │
│       └── skills/
│           ├── brand-context-builder/
│           │   ├── SKILL.md
│           │   └── index.js
│           ├── telegram-notifier/
│           │   ├── SKILL.md
│           │   └── index.js
│           ├── analytics-collector/
│           │   ├── SKILL.md
│           │   └── index.js
│           ├── db-state-manager/
│           │   ├── SKILL.md
│           │   └── index.js
│           └── workflows/
│               ├── content-lifecycle.js
│               └── weekly-planning.js
│
├── agents/
│   └── orchestrator/
│       └── agent/                      # agentDir (auth, sessions)
│
└── skills/                             # Global skills (managed/installed)
```

### Next.js Dashboard

```
Dashboard-OpenClaw/
├── package.json
├── next.config.ts
├── .env.local                           # DATABASE_URL, OPENCLAW_WS_URL, etc.
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── app/
│   ├── layout.tsx                       # Modified — add marketing nav
│   ├── page.tsx                         # Redirect to /queue
│   │
│   ├── # --- MARKETING PAGES ---
│   ├── queue/page.tsx                   # Content queue (primary view)
│   ├── calendar/page.tsx                # Calendar view
│   ├── analytics/page.tsx               # Analytics dashboard
│   ├── agents-overview/page.tsx         # Agent roster + config links
│   ├── settings/page.tsx                # Business config
│   │
│   ├── # --- FROM FORK (OpenClaw ops) ---
│   ├── (openclaw)/
│   │   ├── overview/page.tsx
│   │   ├── chat/page.tsx                # Direct agent chat (useful for debugging)
│   │   ├── agents/page.tsx
│   │   ├── sessions/page.tsx
│   │   ├── skills/page.tsx
│   │   ├── cron/page.tsx
│   │   ├── config/page.tsx
│   │   └── logs/page.tsx
│   │
│   └── api/
│       ├── content-items/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       ├── transition/route.ts
│       │       └── versions/route.ts
│       ├── businesses/route.ts
│       └── analytics/route.ts
│
├── lib/
│   ├── gateway-client.ts                # Fork: WebSocket client
│   ├── types.ts                         # Fork: RPC method types
│   ├── db.ts                            # New: Prisma singleton
│   └── state-machine.ts                 # New: State validation
│
├── hooks/                               # Fork: gateway hooks
│   ├── use-openclaw-gateway.ts
│   ├── use-openclaw-chat.ts
│   ├── use-openclaw-agents.ts
│   └── use-openclaw-sessions.ts
│
├── contexts/
│   └── OpenClawContext.tsx               # Fork: gateway connection
│
├── components/
│   ├── Sidebar.tsx                      # Modified — marketing nav
│   ├── marketing/
│   │   ├── content-queue.tsx
│   │   ├── content-card.tsx
│   │   ├── calendar-view.tsx
│   │   ├── analytics-charts.tsx
│   │   ├── agent-roster.tsx
│   │   └── business-switcher.tsx
│   └── ui/                              # shadcn/ui components
│
└── types/
    ├── content.ts
    └── api.ts
```

---

## 11. Security & Permissions

### Agent Permission Model

| Actor | Can Do | Cannot Do |
|-------|--------|-----------|
| Orchestrator | Read/write DB via skill, spawn sub-agents, invoke skills, send notifications | Publish posts, modify brand profiles, change system config |
| Content Writer | Generate draft copy | Access DB, send notifications, invoke other skills |
| Reviewer | Review drafts, produce verdicts | Modify drafts, access DB directly, send notifications |
| analytics-collector | Read-only platform analytics APIs, write to analytics_snapshots | Modify content, trigger workflows |
| Ben (dashboard + Telegram) | All actions, manual state transitions, agent feedback | N/A |

### Environment Variables

```bash
# Platform APIs (read-only analytics scopes only)
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_ORG_ID=
FACEBOOK_PAGE_ID=
FACEBOOK_PAGE_ACCESS_TOKEN=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Database
DATABASE_URL=postgresql://...

# OpenClaw
OPENCLAW_GATEWAY_WS_URL=ws://localhost:18789

# Dashboard
DASHBOARD_URL=http://localhost:3000
ADMIN_SECRET=
```

### Safety Rails

1. **No autonomous publishing.** There is no publishing skill. Agents produce ready-to-post content. Ben schedules manually on native platforms.
2. **State machine enforced in Postgres.** Invalid transitions raise exceptions. No agent can skip review.
3. **Maximum 2 revision cycles.** After 2 failed reviews, flagged for human attention.
4. **Audit everything.** Every state transition and agent action logged to `audit_events`.
5. **Sub-agent restrictions.** Content Writer and Reviewer cannot access gateway, cron, or exec tools.
6. **Analytics tokens are read-only.** Platform API tokens only have analytics/read scopes, never publishing scopes.

---

## 12. Phased Build Plan

### Phase 0: Foundation (Days 1–2)
**Goal:** Database, brand profile, and OpenClaw workspace ready.

- [ ] Set up Postgres (local or cloud)
- [ ] Run all migration SQL from Section 3
- [ ] Validate state machine trigger works
- [ ] Create OpenClaw workspace structure (`~/.openclaw/workspaces/marketing-ops/`)
- [ ] Write `SOUL.md`, `AGENTS.md`, `HEARTBEAT.md`, `USER.md`
- [ ] Write NelsonAI `brand-profile.md`, `compliance.md`, `audience.md`, `offers.md`
- [ ] Write `review-checklist.md`, `style-rules.md`
- [ ] Write `platform/linkedin.md`, `platform/facebook.md`

**Deliverable:** Database running, full workspace files written, NelsonAI brand profile complete.

### Phase 1: OpenClaw Core + Telegram (Days 2–5)
**Goal:** Orchestrator running, talking to Ben via Telegram, reading DB state.

- [ ] Install OpenClaw (`npm install -g openclaw@latest`)
- [ ] Run onboarding wizard (`openclaw onboard --install-daemon`)
- [ ] Configure gateway: agents, Telegram channel, bindings
- [ ] Build `db-state-manager` skill
- [ ] Build `brand-context-builder` skill
- [ ] Build `telegram-notifier` skill
- [ ] Test: manually create a content_item in DB, verify Orchestrator picks it up via Telegram
- [ ] Test: send feedback to Orchestrator via Telegram, verify it writes to memory

**Deliverable:** Orchestrator responds via Telegram, reads DB, can be given feedback.

### Phase 2: Content Pipeline (Days 5–10)
**Goal:** End-to-end content creation — brief to ready-to-post.

- [ ] Build Content Writer sub-agent spawn template
- [ ] Build Reviewer sub-agent spawn template
- [ ] Implement deterministic content lifecycle orchestration helper(s)
- [ ] Implement weekly planning prompt + write-back helper(s)
- [ ] Configure heartbeat
- [ ] Configure cron jobs (weekly planning + analytics)
- [ ] Test: full cycle from brief → draft → review → ready_to_post → Telegram notification

**Deliverable:** Can go from a content brief to approved, ready-to-post content with Telegram notification.

### Phase 3: Dashboard MVP (Days 10–16)
**Goal:** Web UI for content queue and agent visibility.

- [ ] Fork `actionagentai/openclaw-dashboard` repo
- [ ] Verify fork runs and connects to gateway
- [ ] Remove voice/nodes pages
- [ ] Move fork pages into `(openclaw)/` route group
- [ ] Add Prisma, create `schema.prisma`
- [ ] Install shadcn/ui
- [ ] Modify `Sidebar.tsx` — add marketing nav
- [ ] Build API routes for content items
- [ ] Build Content Queue page (primary view)
- [ ] Build Agent Roster page
- [ ] Build Settings page
- [ ] Simple auth middleware

**Deliverable:** Dashboard with content queue, agent roster, and fork's ops pages.

### Phase 4: Analytics + Calendar (Days 16–20)
**Goal:** Performance feedback loop and schedule visibility.

- [ ] Set up LinkedIn analytics API access (read-only scope)
- [ ] Set up Facebook insights API access (read-only scope)
- [ ] Build `analytics-collector` skill
- [ ] Wire analytics into weekly planning pipeline context
- [ ] Build Analytics dashboard page
- [ ] Build Calendar view page
- [ ] Add boost candidate detection to analytics collector
- [ ] Test: full weekly cycle — plan → create → review → schedule → analyze → plan again

**Deliverable:** Complete feedback loop working. Analytics inform next week's content planning.

### Phase 5: Polish (Days 20–23)
**Goal:** Production-ready for daily use.

- [ ] Error handling in all skills
- [ ] Rate limit tracking for analytics APIs
- [ ] Dashboard: business switcher for multi-business (prepare for future)
- [ ] Comprehensive logging
- [ ] Load test: create 20 content items, run full pipeline
- [ ] Document workspace file purposes and how to modify agents

**Deliverable:** System ready for daily use with NelsonAI.

### Future Phases (Not MVP)
- X (Twitter) platform support
- Blog content support
- Multi-business support (second business onboarding)
- Token cost tracking and budgets
- A/B testing framework for hooks/CTAs
- Image generation integration (DALL-E / Midjourney via skill)
- **Paid ad optimization system** — separate application sharing Postgres + brand context (see `spec-ad.md`)

### Bridge: Organic → Paid

When analytics-collector detects a post with engagement_rate > 2x business average, it:
1. Sets `boost_candidate = true` on the content item
2. Sends a Telegram notification with the post details
3. Ben decides manually whether to boost via the platform's native ad tools

This creates a data-driven bridge between organic content and paid amplification without requiring any ad platform integrations in this system.

---

## 13. Appendix

### API Reference Notes

**LinkedIn Analytics API:**
- Endpoint: `GET /organizationalEntityShareStatistics`
- Auth: OAuth 2.0, scope `r_organization_social`
- Returns: impressions, clicks, likes, comments, shares

**Facebook Insights API:**
- Endpoint: `GET /{page-id}/insights`
- Auth: Page Access Token, `read_insights` permission
- Returns: impressions, reach, engagement, clicks

**Telegram Bot API:**
- Send message: `POST https://api.telegram.org/bot{token}/sendMessage`
- Inline keyboard: Include `reply_markup` with `inline_keyboard`
- Docs: https://core.telegram.org/bots/api

**OpenClaw Gateway WebSocket:**
- Client/runtime details should be taken from the forked `gateway-client.ts` and generated types, not hard-coded from this document
- Use the fork as the protocol source of truth when implementing activity feeds or realtime UI

### Brand Profile Template

Use this for every new business:

```markdown
# {Business Name} — Brand Profile

## Company Summary
{1-2 sentences: what the company does and for whom}

## Positioning
{How the company is positioned in the market. What makes it different.}

## Target Audience
### Primary ICP
- **Role:** {job title/function}
- **Company size:** {range}
- **Pain points:** {list}
- **Desired outcomes:** {list}

### Secondary ICP
{Same structure}

## Tone & Voice
- **Overall:** {e.g., "Professional but accessible. No jargon unless it adds clarity."}
- **LinkedIn:** {e.g., "Authority-driven. Thought leadership. Peer-to-peer."}
- **Facebook:** {e.g., "Conversational. Community-building. Practical tips."}

## Approved Claims
{List of specific claims the company can make, with sources}
- "{Claim}" — Source: {where this is verified}

## Forbidden Claims
{List of things that must never be said}
- Never claim {X}
- Never compare to {competitor} by name
- Never guarantee {outcomes}

## Offers
### Primary Offer
- **Name:** {offer name}
- **Description:** {what it is}
- **CTA:** {default call to action}

## CTA Preferences
- **LinkedIn:** {preferred CTA style}
- **Facebook:** {preferred CTA style}

## Content Examples
### Good Examples
{2-3 examples of ideal posts}

### Bad Examples
{1-2 examples to avoid, with notes on why}

## Competitors
{List of competitors, positioning differences}
```

---

**End of specification.**
