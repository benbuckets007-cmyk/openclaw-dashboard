CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
    CREATE TYPE business_status AS ENUM ('active', 'paused', 'archived');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE analytics_cadence AS ENUM ('daily', 'weekly', 'biweekly');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE platform AS ENUM ('linkedin', 'facebook', 'x', 'blog');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
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
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE review_outcome AS ENUM ('pass', 'revise', 'reject');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE review_confidence AS ENUM ('high', 'medium', 'low');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE platform_action AS ENUM ('draft_created', 'draft_updated', 'posted', 'deleted');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    status business_status NOT NULL DEFAULT 'active',
    enabled_platforms platform[] NOT NULL DEFAULT '{}',
    posting_cadence JSONB NOT NULL DEFAULT '{}',
    notification_channel TEXT NOT NULL DEFAULT 'telegram',
    analytics_cadence analytics_cadence NOT NULL DEFAULT 'weekly',
    brand_profile_path TEXT,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brand_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    profile JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_profiles_business_active ON brand_profiles(business_id, is_active);

CREATE TABLE IF NOT EXISTS content_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    platform platform NOT NULL,
    state content_state NOT NULL DEFAULT 'planned',
    campaign_theme TEXT,
    brief JSONB,
    scheduled_date DATE,
    priority priority NOT NULL DEFAULT 'normal',
    current_version_id UUID,
    platform_draft_id TEXT,
    platform_draft_url TEXT,
    platform_post_id TEXT,
    platform_post_url TEXT,
    briefed_at TIMESTAMPTZ,
    first_draft_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    published_draft_at TIMESTAMPTZ,
    posted_at TIMESTAMPTZ,
    analyzed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    body TEXT NOT NULL,
    headline TEXT,
    visual_notes TEXT,
    alt_hooks TEXT[] NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_by TEXT NOT NULL,
    model_used TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(content_item_id, version_number)
);

DO $$ BEGIN
    ALTER TABLE content_items
        ADD CONSTRAINT fk_current_version
        FOREIGN KEY (current_version_id)
        REFERENCES content_versions(id)
        ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS review_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_version_id UUID NOT NULL REFERENCES content_versions(id) ON DELETE CASCADE,
    content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    outcome review_outcome NOT NULL,
    brand_fit BOOLEAN,
    claim_safety BOOLEAN,
    platform_fit BOOLEAN,
    clarity_score INTEGER CHECK (clarity_score BETWEEN 1 AND 5),
    revision_notes TEXT,
    risk_flags TEXT[] NOT NULL DEFAULT '{}',
    confidence review_confidence,
    reviewer_agent TEXT NOT NULL,
    model_used TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_publications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    platform platform NOT NULL,
    action platform_action NOT NULL,
    platform_id TEXT,
    platform_url TEXT,
    api_response JSONB,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_item_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    platform platform NOT NULL,
    snapshot_date DATE NOT NULL,
    impressions INTEGER,
    clicks INTEGER,
    likes INTEGER,
    comments INTEGER,
    shares INTEGER,
    saves INTEGER,
    engagement_rate DECIMAL(5,4),
    reach INTEGER,
    raw_data JSONB,
    insights TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(content_item_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_item_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    channel TEXT NOT NULL DEFAULT 'telegram',
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    sent_at TIMESTAMPTZ,
    delivered BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
    content_item_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    from_state content_state,
    to_state content_state,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_items_business_state ON content_items(business_id, state);
CREATE INDEX IF NOT EXISTS idx_content_items_platform ON content_items(platform);
CREATE INDEX IF NOT EXISTS idx_content_items_scheduled ON content_items(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_review_records_content ON review_records(content_item_id);
CREATE INDEX IF NOT EXISTS idx_analytics_business_date ON analytics_snapshots(business_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_audit_content ON audit_events(content_item_id);
CREATE INDEX IF NOT EXISTS idx_audit_business_time ON audit_events(business_id, created_at);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_businesses_updated_at ON businesses;
CREATE TRIGGER set_businesses_updated_at
    BEFORE UPDATE ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_brand_profiles_updated_at ON brand_profiles;
CREATE TRIGGER set_brand_profiles_updated_at
    BEFORE UPDATE ON brand_profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_content_items_updated_at ON content_items;
CREATE TRIGGER set_content_items_updated_at
    BEFORE UPDATE ON content_items
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

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
    IF OLD.state IS NULL OR NEW.state = OLD.state THEN
        RETURN NEW;
    END IF;

    IF NEW.state = 'archived' THEN
        RETURN NEW;
    END IF;

    SELECT ARRAY(
        SELECT jsonb_array_elements_text(valid_transitions -> OLD.state::TEXT)
    ) INTO allowed;

    IF allowed IS NULL OR NEW.state::TEXT != ALL(allowed) THEN
        RAISE EXCEPTION 'Invalid state transition: % -> %', OLD.state, NEW.state;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_state_transition ON content_items;
CREATE TRIGGER check_state_transition
    BEFORE UPDATE OF state ON content_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_state_transition();
