export type Platform = "linkedin" | "facebook" | "x" | "blog";

export type ContentState =
  | "planned"
  | "briefed"
  | "drafting"
  | "draft_ready"
  | "in_review"
  | "revision_required"
  | "approved"
  | "publishing_draft"
  | "draft_on_platform"
  | "notified"
  | "posted"
  | "analyzed"
  | "archived";

export type Priority = "low" | "normal" | "high" | "urgent";

export interface BusinessProfile {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  status?: "active" | "paused" | "archived";
  audience: string;
  tone: string;
  positioning: string;
  complianceRules: string[];
  contentPillars: string[];
  enabledPlatforms?: Platform[];
}

export interface ReviewRecord {
  verdict: "PASS" | "REVISE" | "REJECT";
  confidence: "high" | "medium" | "low";
  note?: string;
  reviewer: string;
  createdAt: string;
}

export interface VersionRecord {
  id: string;
  label: string;
  wordCount: number;
  hook: string;
  cta: string;
  excerpt: string;
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  timestamp: string;
  detail: string;
}

export interface ContentItem {
  id: string;
  businessId?: string;
  businessSlug?: string;
  title: string;
  platform: Platform;
  scheduledDate: string | null;
  campaignTheme: string;
  topic: string;
  state: ContentState;
  priority: Priority;
  brief: string;
  hook: string;
  cta: string;
  draftUrl?: string;
  platformUrl?: string;
  platformPostUrl?: string;
  reviewerNote?: string;
  currentVersion: VersionRecord;
  review: ReviewRecord;
  audit: AuditEvent[];
  revisionCount?: number;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  agent: string;
  kind: "spawn" | "heartbeat" | "draft" | "review" | "complete" | "alert";
  summary: string;
  detail: string;
  business: string;
  platform?: Platform;
}

export interface AnalyticsMetric {
  label: string;
  value: string;
  delta: string;
}

export interface CalendarEntry {
  day: string;
  date: string;
  items: Array<Pick<ContentItem, "id" | "title" | "platform" | "state">>;
}

export interface SettingsCheck {
  label: string;
  value: string;
  tone: "success" | "warning" | "neutral";
}

export interface PipelineColumn {
  state: ContentState;
  label: string;
  items: ContentItem[];
}
