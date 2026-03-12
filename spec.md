# Marketing Operations System — Technical Specification

**Version:** 1.0
**Date:** 2026-03-12
**Author:** Ben (product/architecture), with Claude (spec writing)
**Status:** Draft — ready for engineering review

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Architecture](#2-architecture)
3. [Data Model (Postgres)](#3-data-model-postgres)
4. [OpenClaw Agent Configuration](#4-openclaw-agent-configuration)
5. [Lobster Workflow Pipelines](#5-lobster-workflow-pipelines)
6. [Custom Skills (Platform Integrations)](#6-custom-skills-platform-integrations)
7. [Heartbeat Configuration](#7-heartbeat-configuration)
8. [Next.js Dashboard](#8-nextjs-dashboard)
9. [Telegram Notification System](#9-telegram-notification-system)
10. [File/Directory Structure](#10-filedirectory-structure)
11. [Security & Permissions](#11-security--permissions)
12. [Phased Build Plan](#12-phased-build-plan)
13. [Appendix: API Reference Notes](#13-appendix-api-reference-notes)

---

## 1. Product Overview

### What This Is

A multi-business AI marketing operations system where:
- Each business has a brand profile (tone, audience, claims, compliance rules)
- AI agents plan, draft, review, and prepare social media content
- Content moves through a strict state machine with human approval gates
- Ben receives Telegram notifications when drafts are ready
- Drafts are created on social platforms but never published autonomously
- Analytics feed back into the next planning cycle
- The system is portable: adding a new business means adding a new brand profile

### MVP Scope

- **1 business:** NelsonAI
- **2 platforms:** LinkedIn + Facebook
- **1 notification channel:** Telegram
- **1 analytics cadence:** Weekly
- **No autonomous posting** — agents create drafts, Ben posts manually

### Core Philosophy

- **Database owns lifecycle** — Postgres is the system of record for all content state, not Markdown files
- **Agents decide, tools execute** — LLMs are used only where judgment is needed; deterministic code handles everything else
- **3 agent brains, not 8** — Orchestrator, Content Writer, and Reviewer are the only LLM-powered agents. Publishing, analytics collection, brand context loading, and notifications are skills/workers

---

## 2. Architecture

### Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    UI LAYER                                   │
│  Next.js Dashboard (forked from openclaw-dashboard)          │
│                                                              │
│  Custom marketing pages:                                     │
│  ├── Content pipeline kanban                                 │
│  ├── Approval inbox                                          │
│  ├── Agent activity feed                                     │
│  ├── Brand profile editor (Phase 2)                          │
│  ├── Calendar view (Phase 2)                                 │
│  └── Analytics dashboard (Phase 2)                           │
│                                                              │
│  Kept from fork (ops/admin):                                 │
│  ├── Agent management, Sessions, Skills, Channels            │
│  ├── Cron scheduler, Config editor, Logs viewer              │
│  └── Direct chat with agents                                 │
│                                                              │
│  Connects via: WebSocket (fork's gateway-client.ts, typed)   │
│  Also connects via: REST API to internal Next.js API routes  │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                 DECISION LAYER (OpenClaw)                     │
│                                                              │
│  Orchestrator Agent (persistent, high-reasoning model)       │
│  ├── Reads content state from Postgres                       │
│  ├── Decides next action for each content item               │
│  ├── Spawns sub-agent tasks (Content Writer, Reviewer)       │
│  ├── Invokes Lobster pipelines for multi-step execution      │
│  └── Triggers notifications via telegram-notifier skill      │
│                                                              │
│  Content Writer (sub-agent, spawned per-task)                │
│  ├── Receives: brief + brand context pack + platform rules   │
│  ├── Produces: platform-specific draft copy                  │
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
│  Lobster Pipelines:                                          │
│  ├── content-lifecycle.yaml                                  │
│  │   (brief → draft → review → approve → publish → notify)  │
│  └── weekly-planning.yaml                                    │
│      (analytics summary → themes → briefs → job creation)    │
│                                                              │
│  Custom Skills:                                              │
│  ├── brand-context-builder  (parse brand-profile.md → JSON)  │
│  ├── linkedin-publisher     (LinkedIn Posts API: create draft)│
│  ├── facebook-publisher     (Meta Graph API: create draft)   │
│  ├── telegram-notifier      (Telegram Bot API: send alert)   │
│  ├── analytics-collector    (pull metrics from platforms)     │
│  └── db-state-manager       (read/write content state in PG) │
│                                                              │
│  Heartbeat:                                                  │
│  ├── Daily: "Any stale content items needing attention?"     │
│  └── Weekly: "Trigger analytics collection and planning"     │
│                                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    DATA LAYER                                │
│                                                              │
│  Postgres                                                    │
│  ├── businesses, brand_profiles                              │
│  ├── content_items, content_versions                         │
│  ├── review_records, approvals                               │
│  ├── platform_publications                                   │
│  ├── analytics_snapshots                                     │
│  ├── notification_events                                     │
│  └── audit_events                                            │
│                                                              │
│  OpenClaw Workspace (Markdown — config only)                 │
│  ├── SOUL.md (orchestrator personality)                      │
│  ├── brand-profile.md (per business)                         │
│  ├── review-checklist.md                                     │
│  ├── style-rules.md                                          │
│  └── platform/*.md (platform-specific writing rules)         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| System of record | Postgres | Queryable, transactional, dashboard-friendly. Markdown is for config/prompts only |
| Number of LLM agents | 3 (Orchestrator, Writer, Reviewer) | Minimize handoff complexity and token burn. Everything else is deterministic |
| Workflow engine | Lobster (OpenClaw native) | YAML pipelines with typed data passing and approval gates. Avoids agent re-planning |
| Dashboard framework | Fork of openclaw-dashboard (Next.js 16, App Router) | Gets gateway WebSocket client, typed RPC, React hooks for free. Add Postgres + marketing pages on top |
| Model strategy | High-reasoning for Orchestrator + Reviewer; standard for Writer | Quality where judgment matters, cost savings where generation suffices |
| Publishing model | Draft-only, never autonomous | Safety. Ben reviews and posts manually |

---

## 3. Data Model (Postgres)

### Entity Relationship Overview

```
businesses 1──* content_items 1──* content_versions
    │                │                    │
    │                │               review_records
    │                │
    │           platform_publications
    │                │
    │           analytics_snapshots
    │
    └──* brand_profiles

content_items 1──* notification_events
content_items 1──* audit_events
```

### Table Definitions

#### `businesses`

```sql
CREATE TABLE businesses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL UNIQUE,
    slug            TEXT NOT NULL UNIQUE,
    timezone        TEXT NOT NULL DEFAULT 'America/New_York',
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'paused', 'archived')),
    enabled_platforms TEXT[] NOT NULL DEFAULT '{}',
    posting_cadence JSONB NOT NULL DEFAULT '{}',
    -- posting_cadence example:
    -- {"linkedin": {"posts_per_week": 3}, "facebook": {"posts_per_week": 2}}
    notification_channel TEXT NOT NULL DEFAULT 'telegram',
    analytics_cadence TEXT NOT NULL DEFAULT 'weekly'
                    CHECK (analytics_cadence IN ('daily', 'weekly', 'biweekly')),
    brand_profile_path TEXT,  -- path to brand-profile.md in OpenClaw workspace
    config          JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `content_items`

This is the central table. Every piece of content flows through the state machine here.

```sql
CREATE TYPE content_state AS ENUM (
    'planned',
    'briefed',
    'drafting',
    'draft_ready',
    'in_review',
    'revision_required',
    'approved',
    'publishing_draft',
    'draft_on_platform',
    'notified',
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
    priority        TEXT DEFAULT 'normal'
                    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- Current version tracking
    current_version_id UUID,  -- FK added after content_versions table

    -- Platform publishing
    platform_draft_id   TEXT,     -- ID returned by platform API
    platform_draft_url  TEXT,     -- URL to view draft on platform
    platform_post_id    TEXT,     -- ID after manual posting (if detectable)
    platform_post_url   TEXT,

    -- Timestamps
    briefed_at          TIMESTAMPTZ,
    first_draft_at      TIMESTAMPTZ,
    approved_at         TIMESTAMPTZ,
    published_draft_at  TIMESTAMPTZ,
    posted_at           TIMESTAMPTZ,
    analyzed_at         TIMESTAMPTZ,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_items_business_state ON content_items(business_id, state);
CREATE INDEX idx_content_items_platform ON content_items(platform);
CREATE INDEX idx_content_items_scheduled ON content_items(scheduled_date);
```

#### `content_versions`

Every draft and revision is a version. Nothing is overwritten.

```sql
CREATE TABLE content_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_item_id UUID NOT NULL REFERENCES content_items(id),
    version_number  INTEGER NOT NULL,
    body            TEXT NOT NULL,           -- the actual post copy
    headline        TEXT,                    -- hook/headline if applicable
    visual_notes    TEXT,                    -- suggested image/visual idea
    alt_hooks       TEXT[],                  -- alternate opening lines
    metadata        JSONB NOT NULL DEFAULT '{}',
    -- metadata can include: word_count, estimated_read_time, hashtags, etc.

    created_by      TEXT NOT NULL,           -- agent id that created this
    model_used      TEXT,                    -- LLM model identifier
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

    revision_notes  TEXT,          -- specific feedback if outcome = 'revise'
    risk_flags      TEXT[],        -- e.g., ['unverified_claim', 'off_brand_tone']
    confidence      TEXT CHECK (confidence IN ('high', 'medium', 'low')),

    reviewer_agent  TEXT NOT NULL,  -- agent id
    model_used      TEXT,
    prompt_tokens   INTEGER,
    completion_tokens INTEGER,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_review_records_content ON review_records(content_item_id);
```

#### `platform_publications`

```sql
CREATE TABLE platform_publications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_item_id UUID NOT NULL REFERENCES content_items(id),
    platform        TEXT NOT NULL,
    action          TEXT NOT NULL CHECK (action IN ('draft_created', 'draft_updated', 'posted', 'deleted')),

    platform_id     TEXT,          -- ID from the platform API
    platform_url    TEXT,
    api_response    JSONB,         -- raw API response for debugging
    error           TEXT,          -- error message if failed

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `analytics_snapshots`

```sql
CREATE TABLE analytics_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_item_id UUID REFERENCES content_items(id),  -- nullable for aggregate snapshots
    business_id     UUID NOT NULL REFERENCES businesses(id),
    platform        TEXT NOT NULL,
    snapshot_date   DATE NOT NULL,

    impressions     INTEGER,
    clicks          INTEGER,
    likes           INTEGER,
    comments        INTEGER,
    shares          INTEGER,
    saves           INTEGER,
    engagement_rate DECIMAL(5,4),    -- 0.0000 to 9.9999
    reach           INTEGER,

    raw_data        JSONB,           -- full platform response
    insights        TEXT,            -- AI-generated summary

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(content_item_id, snapshot_date)
);

CREATE INDEX idx_analytics_business_date ON analytics_snapshots(business_id, snapshot_date);
```

#### `notification_events`

```sql
CREATE TABLE notification_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_item_id UUID REFERENCES content_items(id),
    business_id     UUID NOT NULL REFERENCES businesses(id),

    channel         TEXT NOT NULL DEFAULT 'telegram',
    event_type      TEXT NOT NULL,
    -- event_types: 'draft_ready', 'revision_required', 'weekly_summary',
    --              'stale_item_alert', 'error_alert'

    payload         JSONB NOT NULL,
    -- payload example:
    -- {
    --   "title": "NelsonAI — LinkedIn draft ready",
    --   "hook": "AI is eating the world...",
    --   "reviewer_status": "passed",
    --   "draft_url": "https://..."
    -- }

    sent_at         TIMESTAMPTZ,
    delivered       BOOLEAN DEFAULT false,
    read_at         TIMESTAMPTZ,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
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
    details         JSONB,               -- arbitrary context

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_content ON audit_events(content_item_id);
CREATE INDEX idx_audit_business_time ON audit_events(business_id, created_at);
```

### State Machine Transitions

Valid transitions for `content_items.state`:

```
planned           → briefed
briefed           → drafting
drafting          → draft_ready
draft_ready       → in_review
in_review         → approved | revision_required
revision_required → drafting
approved          → publishing_draft
publishing_draft  → draft_on_platform
draft_on_platform → notified
notified          → posted          (manual by Ben)
posted            → analyzed
analyzed          → archived

Any state         → archived        (manual override)
```

Enforce these transitions in a Postgres function:

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
        "approved": ["publishing_draft"],
        "publishing_draft": ["draft_on_platform"],
        "draft_on_platform": ["notified"],
        "notified": ["posted"],
        "posted": ["analyzed"],
        "analyzed": ["archived"]
    }'::JSONB;
    allowed TEXT[];
BEGIN
    -- Always allow transition to archived
    IF NEW.state = 'archived' THEN
        RETURN NEW;
    END IF;

    -- Check if transition is valid
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

Three LLM-powered agents, all running under a single OpenClaw Gateway instance. The Orchestrator is persistent (has its own workspace and heartbeat). The Content Writer and Reviewer are spawned as sub-agents per-task.

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
            timezone: "America/New_York"
          },
          target: "telegram",
          lightContext: true,
          prompt: "Check HEARTBEAT.md and run your scheduled checks."
        },
        tools: {
          allow: ["read", "write", "exec", "skills", "sessions_spawn", "subagents"],
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

You are the operations manager for a multi-business AI marketing system. You coordinate content creation, review, and publishing workflows.

## Core Truths

- You never write content yourself. You delegate to specialist sub-agents.
- You never publish content. You create drafts on platforms for human review.
- You read content state from the database, decide what to do next, and invoke the right tool or sub-agent.
- Quality over speed. A missed post is better than a bad one.

## How You Work

1. Check Postgres for content items needing action (use db-state-manager skill)
2. For items in `briefed` state: spawn a Content Writer sub-agent with the brief + brand context
3. For items in `draft_ready` state: spawn a Reviewer sub-agent
4. For items in `approved` state: invoke the platform publisher skill
5. For published drafts: trigger Telegram notification
6. On heartbeat: scan for stale items, run weekly planning if scheduled

## Decision Rules

- Never advance an item past `approved` without a `pass` review record
- If a review returns `revise`, send the item back to `drafting` with revision notes attached
- Maximum 2 revision cycles. After 2 revisions, flag for human attention.
- If a platform API call fails, log the error and notify via Telegram. Do not retry automatically.

## Permissions

- CAN: read/write database, spawn sub-agents, invoke skills, send notifications
- CANNOT: publish live posts, modify brand profiles, change system configuration

## Communication Style

- Terse operational updates in Telegram. No fluff.
- Include: business name, platform, content title/hook, action taken, any blockers
```

#### `HEARTBEAT.md`

```markdown
# Heartbeat Checklist

Run these checks every heartbeat cycle:

1. **Stale items**: Query content_items where state has not changed in >24 hours and state is not 'posted', 'analyzed', or 'archived'. Alert via Telegram if found.

2. **Review backlog**: Count items in 'in_review' state for >6 hours. Alert if count > 0.

3. **Weekly planning trigger**: If today is Monday and no content_items exist with scheduled_date in the current week, trigger the weekly-planning workflow.

4. **Failed publications**: Check platform_publications for recent errors. Alert if found.

5. **Analytics due**: If today is Monday and last analytics_snapshot for any active business is >7 days old, trigger analytics collection.

If nothing needs attention, return HEARTBEAT_OK.
```

#### `AGENTS.md`

```markdown
# Team

You manage two specialist sub-agents:

## Content Writer
- **Spawn for:** Creating platform-specific drafts from briefs
- **Input:** Brief JSON, brand context pack, platform rules
- **Output:** Draft copy, alternate hooks, visual notes
- **Model:** Standard (cost-optimized for generation tasks)

## Reviewer
- **Spawn for:** Quality review of completed drafts
- **Input:** Draft content, brand context, review checklist
- **Output:** PASS/REVISE verdict, specific notes, risk flags
- **Model:** High-reasoning (needs judgment and nuance)

Do not spawn agents for other tasks. Use skills for publishing, notifications, and analytics.
```

### Sub-Agent Prompt Templates

These are not persistent agents. They are spawned via `sessions_spawn` with a task-specific prompt. The Orchestrator constructs the prompt dynamically using templates below.

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
  "visual_notes": "Suggested image or visual",
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

## 5. Lobster Workflow Pipelines

### Content Lifecycle Pipeline

File: `~/.openclaw/workspaces/marketing-ops/skills/workflows/content-lifecycle.yaml`

```yaml
name: content-lifecycle
description: Move a content item from briefed through to platform draft and notification
args:
  content_item_id:
    required: true
    description: UUID of the content item to process
  business_id:
    required: true
  platform:
    required: true
    description: linkedin | facebook
  max_revisions:
    default: 2

steps:
  - id: load-context
    command: >
      openclaw.invoke --tool db-state-manager --action read
      --args-json '{"table": "content_items", "id": "$LOBSTER_ARG_CONTENT_ITEM_ID"}'

  - id: build-brand-context
    command: >
      openclaw.invoke --tool brand-context-builder
      --args-json '{"business_id": "$LOBSTER_ARG_BUSINESS_ID"}'

  - id: generate-draft
    command: >
      openclaw.invoke --tool sessions_spawn --action spawn
      --args-json '{
        "task": "content-writer",
        "model": "anthropic/claude-sonnet-4-20250514",
        "context": {
          "brief": "$load-context.stdout.brief",
          "brand_context": "$build-brand-context.stdout",
          "platform": "$LOBSTER_ARG_PLATFORM"
        }
      }'

  - id: save-draft
    command: >
      openclaw.invoke --tool db-state-manager --action create-version
      --args-json '{"content_item_id": "$LOBSTER_ARG_CONTENT_ITEM_ID"}'
    stdin: $generate-draft.stdout

  - id: review-draft
    command: >
      openclaw.invoke --tool sessions_spawn --action spawn
      --args-json '{
        "task": "reviewer",
        "model": "anthropic/claude-sonnet-4-20250514",
        "context": {
          "draft": "$generate-draft.stdout",
          "brand_context": "$build-brand-context.stdout"
        }
      }'

  - id: save-review
    command: >
      openclaw.invoke --tool db-state-manager --action save-review
      --args-json '{"content_item_id": "$LOBSTER_ARG_CONTENT_ITEM_ID"}'
    stdin: $review-draft.stdout

  - id: check-approval
    command: >
      echo "$review-draft.stdout" | jq -r '.outcome'
    # Branches based on review outcome

  - id: publish-draft
    command: >
      openclaw.invoke --tool ${LOBSTER_ARG_PLATFORM}-publisher --action create-draft
      --args-json '{"content_item_id": "$LOBSTER_ARG_CONTENT_ITEM_ID"}'
    condition: $check-approval.stdout == "pass"
    approval: required

  - id: notify-ben
    command: >
      openclaw.invoke --tool telegram-notifier --action send
      --args-json '{
        "event_type": "draft_ready",
        "content_item_id": "$LOBSTER_ARG_CONTENT_ITEM_ID"
      }'
    condition: $publish-draft.exitCode == 0
```

### Weekly Planning Pipeline

File: `~/.openclaw/workspaces/marketing-ops/skills/workflows/weekly-planning.yaml`

```yaml
name: weekly-planning
description: Generate content plan for the upcoming week
args:
  business_id:
    required: true

steps:
  - id: collect-analytics
    command: >
      openclaw.invoke --tool analytics-collector --action weekly-summary
      --args-json '{"business_id": "$LOBSTER_ARG_BUSINESS_ID"}'

  - id: load-brand
    command: >
      openclaw.invoke --tool brand-context-builder
      --args-json '{"business_id": "$LOBSTER_ARG_BUSINESS_ID"}'

  - id: generate-plan
    command: >
      openclaw.invoke --tool sessions_spawn --action spawn
      --args-json '{
        "task": "strategy-planning",
        "context": {
          "analytics": "$collect-analytics.stdout",
          "brand_context": "$load-brand.stdout",
          "current_week": "auto"
        }
      }'

  - id: create-content-items
    command: >
      openclaw.invoke --tool db-state-manager --action bulk-create-items
    stdin: $generate-plan.stdout
    approval: required

  - id: notify-plan-ready
    command: >
      openclaw.invoke --tool telegram-notifier --action send
      --args-json '{
        "event_type": "weekly_plan_ready",
        "business_id": "$LOBSTER_ARG_BUSINESS_ID"
      }'
```

---

## 6. Custom Skills (Platform Integrations)

Each skill is a directory under `~/.openclaw/workspaces/marketing-ops/skills/`.

### 6.1 brand-context-builder

**Purpose:** Parse `brand-profile.md` and produce a compact JSON context pack for other agents.

**Directory:** `skills/brand-context-builder/`

#### `SKILL.md`

```markdown
---
name: brand-context-builder
description: Parse a business brand profile and generate a compact context pack for content agents
---

# Brand Context Builder

## When to Use
When the orchestrator needs to prepare brand context before spawning a content writer or reviewer.

## What It Does
1. Reads the brand-profile.md for the specified business
2. Extracts: company summary, positioning, audience segments, tone guidelines, approved claims, forbidden claims, CTA preferences, content examples
3. Returns a JSON context pack optimized for prompt injection

## Usage
Invoke with business_id. Returns JSON.

## Implementation
Run: `node skills/brand-context-builder/index.js --business-id <id>`
```

#### `index.js` (Implementation outline)

```javascript
#!/usr/bin/env node
/**
 * brand-context-builder skill
 *
 * Reads brand-profile.md from the workspace for a given business,
 * parses it into structured JSON, and outputs a compact context pack.
 *
 * Input: --business-id <uuid>
 * Output: JSON to stdout
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import pg from 'pg';

const WORKSPACE_ROOT = process.env.OPENCLAW_WORKSPACE || '~/.openclaw/workspaces/marketing-ops';

async function main() {
    const businessId = process.argv.find((_, i, arr) => arr[i-1] === '--business-id');
    if (!businessId) throw new Error('--business-id required');

    // 1. Get brand_profile_path from Postgres
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const { rows } = await pool.query(
        'SELECT * FROM businesses WHERE id = $1', [businessId]
    );
    const business = rows[0];
    if (!business) throw new Error(`Business not found: ${businessId}`);

    // 2. Read brand-profile.md
    const profilePath = resolve(
        WORKSPACE_ROOT.replace('~', process.env.HOME),
        'businesses',
        business.slug,
        'brand-profile.md'
    );
    const profileContent = readFileSync(profilePath, 'utf-8');

    // 3. Parse sections from markdown
    const contextPack = parseMarkdownProfile(profileContent);

    // 4. Add platform-specific configs from business record
    contextPack.enabled_platforms = business.enabled_platforms;
    contextPack.posting_cadence = business.posting_cadence;

    // 5. Output
    console.log(JSON.stringify(contextPack, null, 2));
    await pool.end();
}

function parseMarkdownProfile(content) {
    const sections = {};
    let currentSection = null;
    let currentContent = [];

    for (const line of content.split('\n')) {
        if (line.startsWith('## ')) {
            if (currentSection) {
                sections[currentSection] = currentContent.join('\n').trim();
            }
            currentSection = line.replace('## ', '').toLowerCase().replace(/\s+/g, '_');
            currentContent = [];
        } else {
            currentContent.push(line);
        }
    }
    if (currentSection) {
        sections[currentSection] = currentContent.join('\n').trim();
    }
    return sections;
}

main().catch(err => {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
});
```

### 6.2 linkedin-publisher

**Purpose:** Create draft posts on LinkedIn via the Posts API.

**Directory:** `skills/linkedin-publisher/`

#### `SKILL.md`

```markdown
---
name: linkedin-publisher
description: Create draft posts on LinkedIn using the Posts API
metadata: {"openclaw": {"requires": {"env": ["LINKEDIN_ACCESS_TOKEN", "LINKEDIN_ORG_ID"]}}}
---

# LinkedIn Publisher

## When to Use
When the orchestrator needs to create a draft post on LinkedIn after a review has passed.

## What It Does
1. Takes a content_item_id
2. Reads the approved content version from Postgres
3. Creates a draft post via LinkedIn Posts API
4. Saves the platform draft ID and URL back to Postgres
5. Returns the draft URL

## Usage
Invoke with content_item_id. Returns JSON with draft_url.

## Implementation
Run: `node skills/linkedin-publisher/index.js --content-item-id <id> --action create-draft`
```

#### `index.js` (Implementation outline)

```javascript
#!/usr/bin/env node
/**
 * linkedin-publisher skill
 *
 * Creates draft posts on LinkedIn via the Posts API (v2).
 *
 * Required env:
 *   LINKEDIN_ACCESS_TOKEN - OAuth 2.0 token with w_member_social or w_organization_social scope
 *   LINKEDIN_ORG_ID       - Organization URN (e.g., "urn:li:organization:12345")
 *   DATABASE_URL           - Postgres connection string
 *
 * LinkedIn Posts API docs:
 *   https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
 *
 * Key notes:
 *   - Posts API replaced legacy ugcPosts API
 *   - Set lifecycleState: "DRAFT" for draft creation
 *   - Requires X-Restli-Protocol-Version: 2.0.0 header
 *   - Rate limit: 100 API calls per day per member
 */

import pg from 'pg';

const LINKEDIN_API = 'https://api.linkedin.com/rest/posts';

async function createDraft(contentItemId) {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

    // 1. Load content item and current version
    const { rows: [item] } = await pool.query(`
        SELECT ci.*, cv.body, cv.headline
        FROM content_items ci
        JOIN content_versions cv ON cv.id = ci.current_version_id
        WHERE ci.id = $1
    `, [contentItemId]);

    if (!item) throw new Error(`Content item not found: ${contentItemId}`);
    if (item.state !== 'approved') throw new Error(`Item not in approved state: ${item.state}`);

    // 2. Create draft on LinkedIn
    const response = await fetch(LINKEDIN_API, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202501'
        },
        body: JSON.stringify({
            author: process.env.LINKEDIN_ORG_ID,
            lifecycleState: 'DRAFT',
            visibility: 'PUBLIC',
            commentary: item.body,
            distribution: {
                feedDistribution: 'MAIN_FEED'
            }
        })
    });

    if (!response.ok) {
        const error = await response.text();
        // Log failure to platform_publications
        await pool.query(`
            INSERT INTO platform_publications (content_item_id, platform, action, error, api_response)
            VALUES ($1, 'linkedin', 'draft_created', $2, $3)
        `, [contentItemId, `HTTP ${response.status}`, error]);

        throw new Error(`LinkedIn API error: ${response.status} — ${error}`);
    }

    const draftId = response.headers.get('x-restli-id');
    const draftUrl = `https://www.linkedin.com/feed/update/${draftId}/`;

    // 3. Update content item
    await pool.query(`
        UPDATE content_items
        SET platform_draft_id = $1, platform_draft_url = $2,
            state = 'draft_on_platform', published_draft_at = now()
        WHERE id = $3
    `, [draftId, draftUrl, contentItemId]);

    // 4. Log to platform_publications
    await pool.query(`
        INSERT INTO platform_publications (content_item_id, platform, action, platform_id, platform_url)
        VALUES ($1, 'linkedin', 'draft_created', $2, $3)
    `, [contentItemId, draftId, draftUrl]);

    // 5. Audit event
    await pool.query(`
        INSERT INTO audit_events (business_id, content_item_id, actor, action, from_state, to_state, details)
        VALUES ($1, $2, 'linkedin-publisher', 'state_transition', 'approved', 'draft_on_platform',
                $3::jsonb)
    `, [item.business_id, contentItemId, JSON.stringify({ draft_id: draftId, draft_url: draftUrl })]);

    console.log(JSON.stringify({ draft_id: draftId, draft_url: draftUrl }));
    await pool.end();
}

const action = process.argv.find((_, i, arr) => arr[i-1] === '--action');
const contentItemId = process.argv.find((_, i, arr) => arr[i-1] === '--content-item-id');

if (action === 'create-draft') {
    createDraft(contentItemId).catch(err => {
        console.error(JSON.stringify({ error: err.message }));
        process.exit(1);
    });
}
```

### 6.3 facebook-publisher

**Purpose:** Create draft posts on a Facebook Page via the Graph API.

**Directory:** `skills/facebook-publisher/`

#### Key Details

```
API Endpoint:   POST https://graph.facebook.com/v19.0/{page-id}/feed
Auth:           Page Access Token (pages_manage_posts permission)
Draft support:  Set published=false to create an unpublished/scheduled post
Key fields:     message, published (false), scheduled_publish_time (optional)
Rate limits:    200 calls per hour per page

Required env:
  FACEBOOK_PAGE_ID
  FACEBOOK_PAGE_ACCESS_TOKEN
  DATABASE_URL
```

Implementation follows the same pattern as `linkedin-publisher`: read from Postgres, call API, save result, update state, write audit event.

### 6.4 telegram-notifier

**Purpose:** Send formatted notification messages to Ben via Telegram Bot API.

**Directory:** `skills/telegram-notifier/`

#### Message Templates

**Draft ready:**
```
🟢 NelsonAI — LinkedIn draft ready
━━━━━━━━━━━━━━━━━━━━━
Hook: {headline}
Review: ✅ Passed (confidence: high)
CTA: {cta}
━━━━━━━━━━━━━━━━━━━━━
📎 Draft: {platform_draft_url}
📋 Dashboard: {dashboard_url}/items/{content_item_id}
```

**Revision required:**
```
🟡 NelsonAI — Facebook draft needs revision
━━━━━━━━━━━━━━━━━━━━━
Issue: {revision_notes}
Flags: {risk_flags}
Attempt: {version_number}/2
━━━━━━━━━━━━━━━━━━━━━
📋 Dashboard: {dashboard_url}/items/{content_item_id}
```

**Weekly summary:**
```
📊 NelsonAI — Weekly Analytics Summary
━━━━━━━━━━━━━━━━━━━━━
Posts this week: {count}
Best: {top_post_hook} ({engagement_rate}%)
Worst: {bottom_post_hook} ({engagement_rate}%)
━━━━━━━━━━━━━━━━━━━━━
Recommendation: {ai_recommendation}
📋 Dashboard: {dashboard_url}/analytics
```

**Stale item alert:**
```
🔴 Stale items need attention
━━━━━━━━━━━━━━━━━━━━━
{count} items stuck for >24h:
{item_list}
━━━━━━━━━━━━━━━━━━━━━
📋 Dashboard: {dashboard_url}/pipeline
```

#### Implementation

```
API: POST https://api.telegram.org/bot{token}/sendMessage
Required env:
  TELEGRAM_BOT_TOKEN
  TELEGRAM_CHAT_ID    (Ben's chat ID or group chat ID)
  DATABASE_URL
  DASHBOARD_URL       (base URL for deep links)
```

### 6.5 analytics-collector

**Purpose:** Pull engagement metrics from LinkedIn and Facebook APIs, save to `analytics_snapshots`.

**Directory:** `skills/analytics-collector/`

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
  1. Query content_items in 'posted' state with platform_post_id set
  2. For each: call platform analytics API
  3. Save to analytics_snapshots
  4. If all items for the week are collected, generate AI summary
  5. Transition items to 'analyzed' state
```

### 6.6 db-state-manager

**Purpose:** Provide a clean interface for agents to read/write Postgres without raw SQL.

**Directory:** `skills/db-state-manager/`

#### Supported Actions

| Action | Description |
|--------|-------------|
| `read` | Read a content item by ID |
| `list` | List content items by state, business, platform |
| `transition` | Move a content item to the next state (validates against state machine) |
| `create-version` | Save a new content version for an item |
| `save-review` | Save a review record and update item state |
| `bulk-create-items` | Create multiple content items from a weekly plan |
| `stats` | Return counts by state for a business |

This skill is the only way agents interact with the database. No agent has direct SQL access.

---

## 7. Heartbeat Configuration

### Orchestrator Heartbeat

```json5
// In gateway config, under orchestrator agent:
heartbeat: {
    every: "30m",
    activeHours: {
        start: "08:00",
        end: "22:00",
        timezone: "America/New_York"
    },
    target: "telegram",
    lightContext: true,
    // Only inject HEARTBEAT.md, not full workspace context
    prompt: "Run your heartbeat checklist from HEARTBEAT.md. Use the db-state-manager skill to check content states. If nothing needs attention, return HEARTBEAT_OK."
}
```

### Cron Jobs (for non-heartbeat scheduled work)

```json5
// In gateway config:
cron: {
    jobs: [
        {
            id: "weekly-planning",
            schedule: "0 9 * * 1",  // Monday 9am local
            agent: "orchestrator",
            task: "Run the weekly-planning workflow for all active businesses."
        },
        {
            id: "weekly-analytics",
            schedule: "0 8 * * 1",  // Monday 8am local (before planning)
            agent: "orchestrator",
            task: "Run analytics collection for all active businesses for the past week."
        }
    ]
}
```

---

## 8. Next.js Dashboard

### Starting Point: Fork of openclaw-dashboard

**Repo:** https://github.com/actionagentai/openclaw-dashboard

The dashboard is built by **forking the community openclaw-dashboard**, not from scratch. This fork provides the entire OpenClaw gateway integration layer out of the box, saving significant development time.

#### What the Fork Provides (Keep As-Is)

| Component | What It Does | Keep? |
|-----------|-------------|-------|
| `lib/gateway-client.ts` | WebSocket client with challenge/nonce auth, auto-reconnect, typed RPC calls | **Yes — critical** |
| `lib/types.ts` | TypeScript types for 80+ gateway RPC methods and 17 event types | **Yes — critical** |
| `hooks/use-openclaw-gateway.ts` | React hook for gateway connection state | **Yes** |
| `hooks/use-openclaw-chat.ts` | Streaming chat with token-by-token delivery | **Yes** |
| `hooks/use-openclaw-agents.ts` | Agent CRUD and management | **Yes** |
| `hooks/use-openclaw-sessions.ts` | Session browsing and history | **Yes** |
| `contexts/OpenClawContext.tsx` | Shared gateway connection provider | **Yes** |
| `app/agents/` page | Agent management UI | **Yes** — useful for ops |
| `app/sessions/` page | Session browsing | **Yes** — useful for debugging |
| `app/cron/` page | Cron job scheduling UI | **Yes** — useful for ops |
| `app/logs/` page | Real-time log streaming | **Yes** — useful for debugging |
| `app/config/` page | Configuration editor | **Yes** — useful for ops |
| `app/skills/` page | Skills marketplace with eligibility | **Yes** — useful for ops |
| `components/Sidebar.tsx` | Navigation sidebar | **Yes — modify** to add marketing pages |

#### What to Remove from the Fork

| Component | Why Remove |
|-----------|-----------|
| `app/voice/` page | Not relevant to marketing ops |
| `app/nodes/` page | Device pairing not needed |
| `hooks/use-openclaw-tts.ts` | Voice features not needed |
| `hooks/use-speech-to-text.ts` | Voice features not needed |
| `components/FloatingMicButton.tsx` | Voice features not needed |
| `components/VoiceTranscriptPreview.tsx` | Voice features not needed |
| `app/api/tts-audio/` | Audio proxy not needed |

#### What to Add (Custom Marketing Pages)

These are the new pages and features built on top of the fork:

| New Page | Purpose |
|----------|---------|
| `app/pipeline/` | Content pipeline kanban board |
| `app/inbox/` | Approval inbox — items needing Ben's action |
| `app/items/[id]/` | Content item detail — versions, reviews, audit log |
| `app/activity/` | Agent activity feed — real-time from gateway WS |
| `app/brands/[slug]/` | Brand profile viewer/editor (Phase 2) |
| `app/calendar/` | Calendar view (Phase 2) |
| `app/analytics/` | Analytics dashboard (Phase 2) |
| `app/settings/` | Business config, API key status, agent health |

#### What to Add (Infrastructure)

The fork is stateless (no database). We add Postgres via Prisma:

| Addition | Purpose |
|----------|---------|
| `prisma/schema.prisma` | Prisma schema mirroring Postgres tables from Section 3 |
| `lib/db.ts` | Prisma client singleton |
| `lib/state-machine.ts` | Client-side state transition validation |
| `lib/telegram.ts` | Telegram webhook handler for "Mark Posted" callbacks |
| `app/api/content-items/` | CRUD and state transition API routes |
| `app/api/businesses/` | Business management API routes |
| `app/api/reviews/` | Review record API routes |
| `app/api/analytics/` | Analytics snapshot API routes |
| `app/api/audit/` | Audit event API routes |

### Tech Stack (Inherited + Extended)

| Component | Choice | Source |
|-----------|--------|--------|
| Framework | Next.js 16 (App Router) | Fork |
| React | React 19 | Fork |
| Styling | Tailwind CSS v4 + Lucide icons | Fork (add shadcn/ui for marketing pages) |
| Gateway connection | WebSocket v3 with typed RPC | Fork (`gateway-client.ts`, `types.ts`) |
| Hooks | Pre-built gateway hooks | Fork (6 hooks) |
| Database | Postgres via Prisma ORM | **New** — added for content state management |
| Auth | Single-user admin (env-based secret) | **New** — fork has no auth |
| Hosting | Self-hosted or Vercel | Either |

### Route Structure (Full — fork pages + new pages)

```
app/
├── layout.tsx                  # Modified: add business switcher to fork's sidebar
├── page.tsx                    # Modified: redirect to /pipeline instead of /overview
│
│── # --- NEW MARKETING PAGES (custom) ---
├── pipeline/
│   └── page.tsx                # Content pipeline kanban board
│
├── inbox/
│   └── page.tsx                # Approval inbox — items needing Ben's action
│
├── items/
│   └── [id]/
│       └── page.tsx            # Content item detail — versions, reviews, audit log
│
├── activity/
│   └── page.tsx                # Agent activity feed — real-time from gateway WS
│
├── brands/
│   └── [slug]/
│       └── page.tsx            # Brand profile viewer/editor (Phase 2)
│
├── calendar/
│   └── page.tsx                # Calendar view (Phase 2)
│
├── analytics/
│   └── page.tsx                # Analytics dashboard (Phase 2)
│
├── settings/
│   └── page.tsx                # Business config, API keys, agent status
│
│── # --- KEPT FROM FORK (OpenClaw ops/admin) ---
├── (openclaw)/                 # Route group for fork's original pages
│   ├── overview/page.tsx       # Gateway health, channel status
│   ├── chat/page.tsx           # Direct chat with agents
│   ├── agents/page.tsx         # Agent management
│   ├── sessions/page.tsx       # Session browsing
│   ├── models/page.tsx         # LLM model catalog
│   ├── skills/page.tsx         # Skills marketplace
│   ├── channels/page.tsx       # Channel linking
│   ├── cron/page.tsx           # Cron job management
│   ├── config/page.tsx         # Configuration editor
│   └── logs/page.tsx           # Real-time logs
│
│── # --- NEW API ROUTES (custom) ---
└── api/
    ├── content-items/
    │   ├── route.ts            # CRUD for content items
    │   └── [id]/
    │       ├── route.ts        # Single item operations
    │       ├── transition/
    │       │   └── route.ts    # State transitions
    │       └── versions/
    │           └── route.ts    # Content versions
    │
    ├── businesses/
    │   └── route.ts
    │
    ├── reviews/
    │   └── route.ts
    │
    ├── analytics/
    │   └── route.ts
    │
    ├── audit/
    │   └── route.ts
    │
    └── webhooks/
        └── telegram/
            └── route.ts        # Telegram callback for "Mark Posted" buttons
```

### MVP Screens (Phase 1)

#### Screen 1: Content Pipeline (Kanban)

The primary working view. Columns map to content states.

```
┌──────────────────────────────────────────────────────────────────────┐
│  [NelsonAI ▼]                                    Marketing Ops       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Planned(3)  Drafting(1)  In Review(2)  Approved(1)  On Platform(2) │
│  ┌────────┐  ┌────────┐  ┌────────┐    ┌────────┐   ┌────────┐     │
│  │LinkedIn│  │Facebook│  │LinkedIn│    │Facebook│   │LinkedIn│     │
│  │Mar 17  │  │Mar 15  │  │Mar 14  │    │Mar 14  │   │Mar 13  │     │
│  │AI opps │  │Tips for│  │Why CFOs│    │3 signs │   │The hid.│     │
│  │        │  │small.. │  │need ...|    │your ...|   │cost ...|     │
│  │🔵 plan │  │🟡 draft│  │🟠 rev  │    │🟢 ready│   │📌 live │     │
│  └────────┘  └────────┘  └────────┘    └────────┘   └────────┘     │
│  ┌────────┐              ┌────────┐                  ┌────────┐     │
│  │Facebook│              │Facebook│                  │Facebook│     │
│  │Mar 18  │              │Mar 14  │                  │Mar 12  │     │
│  │How we  │              │Stop do.│                  │Is your │     │
│  │saved.. │              │this ...|                  │team ...|     │
│  │🔵 plan │              │🟠 rev  │                  │📌 live │     │
│  └────────┘              └────────┘                  └────────┘     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

Interactions:
- Click card → opens item detail page
- Drag not needed (state transitions happen via agent actions or explicit buttons)
- Filter by platform, date range, priority
- "Mark as Posted" button on `draft_on_platform` items (manual action by Ben)

#### Screen 2: Approval Inbox

Focused view of items needing Ben's attention.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Approval Inbox                                          2 pending   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ 🟢 LinkedIn — "Why CFOs need AI literacy in 2026"              │  │
│  │ Review: PASSED (confidence: high) · Version 1                  │  │
│  │ Hook: "Your CFO doesn't need to code. But they need to..."     │  │
│  │ CTA: Book intro call                                           │  │
│  │                                                                │  │
│  │ [View Draft ↗]  [View on LinkedIn ↗]  [✅ Mark Posted]         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ 🟡 Facebook — "3 signs your team is ready for AI"              │  │
│  │ Review: PASSED (confidence: medium) · Version 2 (revised once) │  │
│  │ Hook: "Most teams think they're not ready. Here's the test..." │  │
│  │ CTA: Download checklist                                        │  │
│  │ ⚠️ Reviewer note: "Medium confidence — CTA could be stronger" │  │
│  │                                                                │  │
│  │ [View Draft ↗]  [View on Facebook ↗]  [✅ Mark Posted]         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### Screen 3: Agent Activity Feed

Real-time feed showing what agents are doing, powered by the OpenClaw Gateway WebSocket.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Agent Activity                                    [Live 🔴]         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  12:34 PM  🤖 Orchestrator                                          │
│            Spawned Content Writer for: "AI opportunity snapshot"      │
│            Platform: LinkedIn · Business: NelsonAI                    │
│                                                                      │
│  12:33 PM  🤖 Orchestrator                                          │
│            Heartbeat check: 1 item in review > 6hrs — alerting      │
│                                                                      │
│  12:15 PM  📝 Content Writer                                        │
│            Draft completed for: "Stop doing this to your Facebook"   │
│            Version 1 · 247 words · 2 alt hooks generated             │
│                                                                      │
│  12:10 PM  🔍 Reviewer                                              │
│            Review: REVISE for "Is your team actually ready?"         │
│            Issue: CTA too vague, claim in paragraph 2 unverifiable   │
│                                                                      │
│  11:45 AM  🤖 Orchestrator                                          │
│            ✅ Heartbeat OK — no items needing attention               │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### API Routes Design

All API routes follow this pattern:

```typescript
// app/api/content-items/route.ts

import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET /api/content-items?business_id=...&state=...&platform=...
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');
    const state = searchParams.get('state');
    const platform = searchParams.get('platform');

    const items = await prisma.contentItem.findMany({
        where: {
            ...(businessId && { businessId }),
            ...(state && { state }),
            ...(platform && { platform }),
        },
        include: {
            currentVersion: true,
            reviewRecords: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { scheduledDate: 'asc' },
    });

    return NextResponse.json(items);
}

// POST /api/content-items/{id}/transition
// Body: { "to_state": "posted" }
// Validates transition via Postgres trigger
```

### WebSocket Gateway Connection (Provided by Fork)

The forked openclaw-dashboard already includes a complete, production-grade gateway client.
**Do not rewrite this.** Use the existing implementation:

```
# Files provided by the fork:
lib/gateway-client.ts    # WebSocket client with challenge/nonce auth, reconnection, typed RPC
lib/types.ts             # TypeScript types for 80+ RPC methods, 17 event types
hooks/use-openclaw-gateway.ts   # Connection state hook
contexts/OpenClawContext.tsx     # Shared connection provider
```

**Connection flow (already implemented):**
1. Client connects to gateway WebSocket (default: `ws://localhost:18789`)
2. Server sends `connect.challenge` with nonce
3. Client responds with authenticated `connect` request
4. Server sends `hello-ok` with features, snapshot, and policy
5. Typed RPC calls via `rpc(method, params)` pattern
6. Event subscriptions for `chat`, `agent`, `health`, `presence`

**Events relevant to marketing ops (subscribe in the Activity Feed page):**
- `session.message` — agent sent a message (log to activity feed)
- `session.spawn` — sub-agent spawned (show "Content Writer started for...")
- `session.complete` — sub-agent finished (show "Draft completed" or "Review: PASS")
- `heartbeat.result` — heartbeat check result (show "Heartbeat OK" or alerts)
- `cron.triggered` — scheduled job fired (show "Weekly planning started")

**Usage in custom marketing pages:**

```typescript
// In any custom page, use the fork's existing hook:
import { useOpenClawGateway } from '@/hooks/use-openclaw-gateway';

export default function ActivityFeed() {
    const { connected, events, rpc } = useOpenClawGateway();

    // events already typed via lib/types.ts
    // rpc() gives typed access to 80+ gateway methods

    return (
        <div>
            {events.map(event => (
                <ActivityEventRow key={event.id} event={event} />
            ))}
        </div>
    );
}
```

---

## 9. Telegram Notification System

### Setup

1. Create a Telegram bot via @BotFather
2. Get the bot token
3. Start a conversation with the bot (or add to a group)
4. Get the chat ID via `https://api.telegram.org/bot{token}/getUpdates`
5. Set env vars: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

### Notification Events

| Event | Trigger | Priority |
|-------|---------|----------|
| `draft_ready` | Content item reaches `draft_on_platform` state | Normal |
| `revision_required` | Reviewer returns `revise` verdict | Normal |
| `weekly_plan_ready` | Weekly planning pipeline completes | Low |
| `weekly_summary` | Weekly analytics are collected | Low |
| `stale_item_alert` | Heartbeat detects items stuck >24h | High |
| `error_alert` | Platform API error or agent failure | High |

### Actionable Buttons (Telegram Inline Keyboard)

```json
{
    "inline_keyboard": [
        [
            {"text": "View Draft ↗", "url": "{platform_draft_url}"},
            {"text": "Open Dashboard ↗", "url": "{dashboard_url}/items/{id}"}
        ],
        [
            {"text": "✅ Mark Posted", "callback_data": "mark_posted:{content_item_id}"}
        ]
    ]
}
```

The `mark_posted` callback triggers a state transition in Postgres via a webhook from the Telegram bot.

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
│           ├── linkedin-publisher/
│           │   ├── SKILL.md
│           │   └── index.js
│           ├── facebook-publisher/
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
│               ├── content-lifecycle.yaml
│               └── weekly-planning.yaml
│
├── agents/
│   └── orchestrator/
│       └── agent/                      # agentDir (auth, sessions — do not share)
│
└── skills/                             # Global skills (managed/installed)
```

### Next.js Dashboard (Forked from openclaw-dashboard)

```
Dashboard-OpenClaw/                      # Forked from github.com/actionagentai/openclaw-dashboard
├── package.json                         # Fork's deps + prisma, shadcn/ui added
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.local                           # DATABASE_URL, OPENCLAW_WS_URL, ADMIN_SECRET, etc.
│
├── prisma/                              # NEW — not in fork
│   ├── schema.prisma                    # Mirrors Postgres schema from Section 3
│   └── migrations/
│
├── app/                                 # Fork uses app/ not src/app/
│   ├── layout.tsx                       # MODIFIED — add business switcher + marketing nav
│   ├── page.tsx                         # MODIFIED — redirect to /pipeline
│   │
│   ├── # --- NEW MARKETING PAGES ---
│   ├── pipeline/page.tsx                # Content pipeline kanban
│   ├── inbox/page.tsx                   # Approval inbox
│   ├── items/[id]/page.tsx              # Content item detail
│   ├── activity/page.tsx                # Agent activity feed
│   ├── brands/[slug]/page.tsx           # Brand profile editor (Phase 2)
│   ├── calendar/page.tsx                # Calendar view (Phase 2)
│   ├── analytics/page.tsx               # Analytics dashboard (Phase 2)
│   ├── settings/page.tsx                # Business config
│   │
│   ├── # --- KEPT FROM FORK ---
│   ├── (openclaw)/
│   │   ├── overview/page.tsx            # Gateway health
│   │   ├── chat/page.tsx                # Direct agent chat
│   │   ├── agents/page.tsx              # Agent management
│   │   ├── sessions/page.tsx            # Session browser
│   │   ├── models/page.tsx              # Model catalog
│   │   ├── skills/page.tsx              # Skills marketplace
│   │   ├── channels/page.tsx            # Channel linking
│   │   ├── cron/page.tsx                # Cron scheduler
│   │   ├── config/page.tsx              # Config editor
│   │   └── logs/page.tsx                # Log viewer
│   │
│   └── api/                             # NEW — marketing API routes
│       ├── content-items/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       ├── transition/route.ts
│       │       └── versions/route.ts
│       ├── businesses/route.ts
│       ├── reviews/route.ts
│       ├── analytics/route.ts
│       ├── audit/route.ts
│       └── webhooks/telegram/route.ts
│
├── # --- FROM FORK (do not modify) ---
├── lib/
│   ├── gateway-client.ts                # Fork: WebSocket client w/ auth + reconnect
│   └── types.ts                         # Fork: 80+ RPC method types, 17 event types
│
├── hooks/                               # Fork: pre-built gateway hooks
│   ├── use-openclaw-gateway.ts
│   ├── use-openclaw-chat.ts
│   ├── use-openclaw-agents.ts
│   ├── use-openclaw-sessions.ts
│   └── use-openclaw-models.ts
│
├── contexts/
│   └── OpenClawContext.tsx               # Fork: shared gateway connection
│
├── # --- NEW FILES ---
├── lib/
│   ├── db.ts                            # NEW: Prisma client singleton
│   ├── state-machine.ts                 # NEW: Client-side state validation
│   └── telegram.ts                      # NEW: Telegram webhook handler
│
├── components/
│   ├── Sidebar.tsx                      # MODIFIED — add marketing nav items
│   ├── # --- NEW COMPONENTS ---
│   ├── marketing/
│   │   ├── pipeline-board.tsx
│   │   ├── content-card.tsx
│   │   ├── approval-card.tsx
│   │   ├── activity-feed.tsx
│   │   ├── business-switcher.tsx
│   │   └── notification-badge.tsx
│   └── ui/                              # NEW: shadcn/ui components
│
├── types/                               # NEW: marketing-specific types
│   ├── content.ts
│   └── api.ts
│
└── tests/
```

---

## 11. Security & Permissions

### Agent Permission Model

| Actor | Can Do | Cannot Do |
|-------|--------|-----------|
| Orchestrator | Read/write DB via skill, spawn sub-agents, invoke skills, send notifications | Publish live posts, modify brand profiles, change system config |
| Content Writer | Generate draft copy | Access DB, invoke platform APIs, send notifications |
| Reviewer | Review drafts, produce verdicts | Modify drafts, publish, access platform APIs |
| linkedin-publisher | Create drafts on LinkedIn, update DB state | Publish live (lifecycleState always = DRAFT) |
| facebook-publisher | Create unpublished posts on Facebook, update DB state | Set published=true |
| analytics-collector | Read-only access to platform analytics APIs | Modify content, trigger workflows |
| Ben (dashboard) | All actions, manual state transitions, final publishing authority | N/A |

### API Key Management

All sensitive credentials stored as environment variables, never in config files:

```bash
# Platform APIs
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
OPENCLAW_GATEWAY_WS_URL=ws://localhost:3001

# Dashboard
DASHBOARD_URL=http://localhost:3000
ADMIN_SECRET=  # Simple auth for single-user MVP
```

### Safety Rails

1. **No autonomous publishing.** Publisher skills always create drafts (LinkedIn `lifecycleState: DRAFT`, Facebook `published: false`). There is no code path that sets a post to live.
2. **State machine enforced in Postgres.** Invalid transitions raise exceptions. No agent can skip review.
3. **Maximum 2 revision cycles.** After 2 failed reviews, item is flagged for human attention instead of infinite loops.
4. **Audit everything.** Every state transition, agent action, and API call is logged to `audit_events`.
5. **Sub-agent tool restrictions.** Content Writer and Reviewer sub-agents cannot access gateway, cron, or exec tools.

---

## 12. Phased Build Plan

### Phase 0: Foundation (Days 1-2)
**Goal:** Data model and brand profile ready.

- [ ] Set up Postgres (local or cloud)
- [ ] Run all migration SQL from Section 3
- [ ] Validate state machine trigger works
- [ ] Write `brand-profile.md` for NelsonAI (use template below)
- [ ] Write `review-checklist.md`, `style-rules.md`
- [ ] Write `platform/linkedin.md`, `platform/facebook.md`

**Deliverable:** Database running, NelsonAI brand files in workspace.

### Phase 1: OpenClaw Core (Days 2-4)
**Goal:** Orchestrator agent running with Telegram.

- [ ] Install OpenClaw (`npm install -g openclaw@latest`)
- [ ] Run onboarding wizard (`openclaw onboard --install-daemon`)
- [ ] Configure gateway: agents, channels (Telegram), bindings
- [ ] Write `SOUL.md`, `AGENTS.md`, `HEARTBEAT.md`
- [ ] Build `db-state-manager` skill
- [ ] Build `brand-context-builder` skill
- [ ] Test: manually create a content_item in DB, verify orchestrator picks it up

**Deliverable:** Orchestrator responds to Telegram messages, reads DB state.

### Phase 2: LinkedIn Integration (Days 4-8)
**Goal:** End-to-end content creation for LinkedIn.

- [ ] Set up LinkedIn App (developer.linkedin.com), obtain OAuth token
- [ ] Build `linkedin-publisher` skill
- [ ] Test draft creation via API independently
- [ ] Wire into orchestrator workflow
- [ ] Build Content Writer sub-agent spawn template
- [ ] Build Reviewer sub-agent spawn template
- [ ] Test full cycle: brief → draft → review → publish draft

**Deliverable:** Can go from a content brief to a LinkedIn draft post.

### Phase 3: Lobster Pipelines + Notifications (Days 8-12)
**Goal:** Deterministic workflow execution and Telegram alerts.

- [ ] Install Lobster
- [ ] Write `content-lifecycle.yaml` pipeline
- [ ] Write `weekly-planning.yaml` pipeline
- [ ] Build `telegram-notifier` skill
- [ ] Configure inline keyboard buttons for Telegram
- [ ] Set up heartbeat configuration
- [ ] Configure cron jobs (weekly planning, weekly analytics)
- [ ] Test: full pipeline from brief to Telegram notification

**Deliverable:** Content moves through pipeline automatically, Ben gets notified.

### Phase 4: Dashboard MVP (Days 12-18)
**Goal:** Web UI for pipeline management and approvals.

- [ ] Fork `actionagentai/openclaw-dashboard` repo
- [ ] Verify fork runs and connects to gateway (`npm install && npm run dev`)
- [ ] Remove unneeded pages: voice/, nodes/, tts hooks, mic button
- [ ] Move fork's original pages into `(openclaw)/` route group
- [ ] Add Prisma dependency, create `schema.prisma` from Section 3
- [ ] Run `prisma migrate dev` to verify schema matches existing Postgres
- [ ] Install shadcn/ui for marketing-specific components
- [ ] Modify `Sidebar.tsx`: add marketing nav (Pipeline, Inbox, Activity) above fork's ops pages
- [ ] Add `business-switcher.tsx` component to layout
- [ ] Build API routes for content items, transitions, reviews
- [ ] Build Pipeline Kanban page (uses Prisma for data, fork's gateway hooks for real-time)
- [ ] Build Approval Inbox page
- [ ] Build Agent Activity Feed (subscribe to fork's gateway events via `useOpenClawGateway`)
- [ ] Build Content Item Detail page
- [ ] Simple auth middleware (env-based admin secret)

**Deliverable:** Functional dashboard with pipeline view, approval inbox, and all fork ops pages working.

**Note on fork maintenance:** Pin the fork to a specific commit. Do not auto-merge upstream changes. Periodically review upstream releases and cherry-pick relevant updates to `lib/gateway-client.ts` and `lib/types.ts` if the gateway protocol evolves.

### Phase 5: Facebook + Analytics (Days 18-22)
**Goal:** Second platform and feedback loop.

- [ ] Set up Facebook App, obtain Page Access Token
- [ ] Build `facebook-publisher` skill
- [ ] Add Facebook-specific prompt template for Content Writer
- [ ] Build `analytics-collector` skill (LinkedIn + Facebook)
- [ ] Wire analytics into weekly planning pipeline
- [ ] Test full cycle for both platforms

**Deliverable:** LinkedIn + Facebook both working, analytics feeding back into planning.

### Phase 6: Polish + Hardening (Days 22-25)
**Goal:** Production-ready system.

- [ ] Error handling and retry logic for all platform API calls
- [ ] Rate limit tracking and backoff
- [ ] Dashboard: Settings page (API key status, agent health)
- [ ] Dashboard: Brand profile viewer
- [ ] Comprehensive logging and monitoring
- [ ] Document runbook for common operations
- [ ] Load test: create 20 content items, run full pipeline

**Deliverable:** System ready for daily use.

### Future Phases (Not MVP)
- Calendar view in dashboard
- Analytics dashboard with charts
- X (Twitter) agent and publisher
- Blog agent and publisher
- Multi-business support (second business onboarding)
- Token cost tracking and budgets
- A/B testing framework for hooks/CTAs

---

## 13. Appendix: API Reference Notes

### LinkedIn Posts API
- **Docs:** https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
- **Endpoint:** `POST https://api.linkedin.com/rest/posts`
- **Draft support:** Set `lifecycleState: "DRAFT"`
- **Auth:** OAuth 2.0, scope `w_organization_social`
- **Headers:** `X-Restli-Protocol-Version: 2.0.0`, `LinkedIn-Version: 202501`
- **Rate limit:** 100 calls/day per member
- **Note:** Posts API replaces legacy ugcPosts API

### Facebook Graph API (Pages)
- **Docs:** https://developers.facebook.com/docs/pages-api/posts/
- **Endpoint:** `POST https://graph.facebook.com/v19.0/{page-id}/feed`
- **Draft support:** Set `published: false`
- **Auth:** Page Access Token with `pages_manage_posts` permission
- **Rate limit:** 200 calls/hour per page

### Telegram Bot API
- **Docs:** https://core.telegram.org/bots/api
- **Send message:** `POST https://api.telegram.org/bot{token}/sendMessage`
- **Inline keyboard:** Include `reply_markup` with `inline_keyboard` array
- **Webhooks:** Set via `setWebhook` for callback button handling

### OpenClaw Gateway WebSocket
- **Protocol:** v3 JSON
- **Default port:** 18789
- **Reference:** https://github.com/actionagentai/openclaw-dashboard
- **Client implementation:** Already provided by fork in `lib/gateway-client.ts` — do not rewrite
- **Types:** Already provided by fork in `lib/types.ts` — 80+ RPC methods, 17 event types
- **Key events for marketing ops:** `session.message`, `session.spawn`, `session.complete`, `heartbeat.result`, `cron.triggered`

### Brand Profile Template

Use this template for every new business:

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
- **LinkedIn:** {e.g., "Authority-driven. Data-backed. Thought leadership."}
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
{What the business sells and how it's framed}
### Primary Offer
- **Name:** {offer name}
- **Description:** {what it is}
- **CTA:** {default call to action}
- **Price:** {if public}

## CTA Preferences
- **LinkedIn:** {preferred CTA style, e.g., "Book a call", "DM me"}
- **Facebook:** {preferred CTA style, e.g., "Download the guide", "Comment below"}

## Content Examples
### Good Examples
{Paste 2-3 examples of posts that represent the ideal tone and quality}

### Bad Examples
{Paste 1-2 examples of posts to avoid, with notes on why}

## Competitors
{List of competitors, positioning differences}

## Local Context
{Any geographic, cultural, or market-specific context}
```

---

**End of specification.**
