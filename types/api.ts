import type {
  ActivityEvent,
  AnalyticsMetric,
  BusinessProfile,
  CalendarEntry,
  ContentItem,
  SettingsCheck,
} from "@/types/content";

export interface PipelineResponse {
  business: BusinessProfile;
  items: ContentItem[];
  metrics: AnalyticsMetric[];
  pendingApprovalCount: number;
  dataSource: "database" | "mock";
}

export interface ActivityResponse {
  business: BusinessProfile;
  events: ActivityEvent[];
  dataSource: "database" | "mock";
}

export interface CalendarResponse {
  business: BusinessProfile;
  calendar: CalendarEntry[];
  dataSource: "database" | "mock";
}

export interface SettingsResponse {
  business: BusinessProfile;
  checks: SettingsCheck[];
  dataSource: "database" | "mock";
}
