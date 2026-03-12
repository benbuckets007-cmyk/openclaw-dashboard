import { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { canTransition, PIPELINE_STATE_ORDER, STATE_LABELS } from "@/lib/state-machine";
import {
  activityEvents as mockActivityEvents,
  analyticsMetrics as mockAnalyticsMetrics,
  business as mockBusiness,
  contentItems as mockContentItems,
  getApprovalItems as getMockApprovalItems,
  getItemById as getMockItemById,
  settingsChecks as mockSettingsChecks,
  weeklyCalendar as mockWeeklyCalendar,
} from "@/lib/mock-data";
import type {
  ActivityEvent,
  AnalyticsMetric,
  BusinessProfile,
  CalendarEntry,
  ContentItem,
  ContentState,
  Platform,
  SettingsCheck,
} from "@/types/content";

type DbContentItem = Prisma.ContentItemGetPayload<{
  include: {
    currentVersion: true;
    reviewRecords: { orderBy: { createdAt: "desc" }; take: 1 };
    auditEvents: { orderBy: { createdAt: "desc" } };
  };
}>;

const businessFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatScheduledDate(value: Date | null | undefined) {
  return value ? businessFormatter.format(value) : null;
}

function formatDateTime(value: Date | null | undefined) {
  return value ? dateTimeFormatter.format(value) : "Pending";
}

function extractBriefField(brief: Prisma.JsonValue | null | undefined, key: string) {
  if (!brief || typeof brief !== "object" || Array.isArray(brief)) {
    return "";
  }

  const record = brief as Record<string, Prisma.JsonValue>;
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function fallbackText(...values: Array<string | null | undefined>) {
  return values.find((value) => value && value.trim().length > 0)?.trim() ?? "";
}

function mapBusinessFromProfile(profile: Prisma.JsonValue | null | undefined, business: { id: string; name: string; slug: string; timezone: string; status: string; enabledPlatforms: Platform[] }) {
  const data = profile && typeof profile === "object" && !Array.isArray(profile)
    ? (profile as Record<string, Prisma.JsonValue>)
    : {};

  const getString = (key: string, fallback = "") => {
    const value = data[key];
    return typeof value === "string" ? value : fallback;
  };

  const getStringArray = (key: string, fallback: string[] = []) => {
    const value = data[key];
    if (!Array.isArray(value)) {
      return fallback;
    }
    return value.filter((item): item is string => typeof item === "string");
  };

  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    timezone: business.timezone,
    status: business.status as BusinessProfile["status"],
    audience: getString("audience", mockBusiness.audience),
    tone: getString("tone", mockBusiness.tone),
    positioning: getString("positioning", mockBusiness.positioning),
    complianceRules: getStringArray("complianceRules", mockBusiness.complianceRules),
    contentPillars: getStringArray("contentPillars", mockBusiness.contentPillars),
    enabledPlatforms: business.enabledPlatforms,
  } satisfies BusinessProfile;
}

function mapContentItem(item: DbContentItem, businessSlug?: string): ContentItem {
  const latestReview = item.reviewRecords[0];
  const briefTopic = extractBriefField(item.brief, "topic");
  const briefMessage = extractBriefField(item.brief, "key_message");
  const briefAudience = extractBriefField(item.brief, "target_audience");
  const cta = extractBriefField(item.brief, "cta");
  const title = fallbackText(item.currentVersion?.headline, briefTopic, item.campaignTheme, `${item.platform} content`);
  const body = item.currentVersion?.body ?? "";

  return {
    id: item.id,
    businessId: item.businessId,
    businessSlug,
    title,
    platform: item.platform,
    scheduledDate: formatScheduledDate(item.scheduledDate),
    campaignTheme: item.campaignTheme ?? "General",
    topic: fallbackText(briefTopic, briefAudience, "Unspecified"),
    state: item.state,
    priority: item.priority,
    brief: fallbackText(briefMessage, briefTopic, "No brief captured yet."),
    hook: fallbackText(item.currentVersion?.headline, body.slice(0, 110), title),
    cta: cta || "No CTA set",
    draftUrl: item.platformDraftUrl ?? undefined,
    platformUrl: item.platformDraftUrl ?? undefined,
    platformPostUrl: item.platformPostUrl ?? undefined,
    reviewerNote: latestReview?.revisionNotes ?? undefined,
    currentVersion: {
      id: item.currentVersion?.id ?? `brief-${item.id}`,
      label: item.currentVersion ? `Version ${item.currentVersion.versionNumber}` : "Brief only",
      wordCount: body ? body.split(/\s+/).filter(Boolean).length : 0,
      hook: fallbackText(item.currentVersion?.headline, title),
      cta: cta || "No CTA set",
      excerpt: body ? body.slice(0, 220) : "Awaiting draft generation.",
    },
    review: {
      verdict:
        latestReview?.outcome === "pass"
          ? "PASS"
          : latestReview?.outcome === "reject"
            ? "REJECT"
            : "REVISE",
      confidence: latestReview?.confidence ?? "low",
      reviewer: latestReview?.reviewerAgent ?? "Reviewer",
      createdAt: formatDateTime(latestReview?.createdAt),
      note: latestReview?.revisionNotes ?? undefined,
    },
    audit: item.auditEvents.map((event) => ({
      id: event.id,
      actor: event.actor,
      action: event.action,
      timestamp: formatDateTime(event.createdAt),
      detail:
        event.details && typeof event.details === "object" && !Array.isArray(event.details)
          ? JSON.stringify(event.details)
          : "No extra detail recorded.",
    })),
    revisionCount: item.auditEvents.filter((event) => event.toState === "revision_required").length,
  };
}

async function safeDb<T>(query: () => Promise<T>, fallback: T): Promise<{ data: T; dataSource: "database" | "mock" }> {
  if (!isDatabaseConfigured()) {
    return { data: fallback, dataSource: "mock" };
  }

  try {
    return { data: await query(), dataSource: "database" };
  } catch {
    return { data: fallback, dataSource: "mock" };
  }
}

export async function getBusinesses() {
  const fallback = [mockBusiness];
  const result = await safeDb(async () => {
    const businesses = await prisma.business.findMany({
      where: { status: "active" },
      include: {
        brandProfiles: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return businesses.map((business) =>
      mapBusinessFromProfile(business.brandProfiles[0]?.profile, {
        id: business.id,
        name: business.name,
        slug: business.slug,
        timezone: business.timezone,
        status: business.status,
        enabledPlatforms: business.enabledPlatforms as Platform[],
      }),
    );
  }, fallback);

  return result;
}

export async function getBusiness(slug = "nelsonai") {
  const businesses = await getBusinesses();
  const business = businesses.data.find((entry) => entry.slug === slug) ?? businesses.data[0] ?? mockBusiness;

  return {
    business,
    dataSource: businesses.dataSource,
  };
}

export async function getContentItems(slug = "nelsonai") {
  const fallback = mockContentItems;
  const result = await safeDb(async () => {
    const business = await prisma.business.findUnique({
      where: { slug },
      include: {
        contentItems: {
          include: {
            currentVersion: true,
            reviewRecords: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
            auditEvents: {
              orderBy: { createdAt: "desc" },
              take: 8,
            },
          },
          orderBy: [{ scheduledDate: "asc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!business) {
      return [];
    }

    return business.contentItems.map((item) => mapContentItem(item, business.slug));
  }, fallback);

  return result;
}

export async function getPipelineData(slug = "nelsonai") {
  const [{ business, dataSource: businessSource }, itemsResult, metricsResult] = await Promise.all([
    getBusiness(slug),
    getContentItems(slug),
    getAnalyticsMetrics(slug),
  ]);

  const pendingApprovalCount = itemsResult.data.filter((item) =>
    ["approved", "draft_on_platform", "notified"].includes(item.state),
  ).length;

  return {
    business,
    items: itemsResult.data,
    metrics: metricsResult.data,
    pendingApprovalCount,
    dataSource: businessSource === "database" && itemsResult.dataSource === "database" ? "database" : "mock",
  } as const;
}

export async function getApprovalItems(slug = "nelsonai") {
  const items = await getContentItems(slug);

  return {
    items:
      items.dataSource === "database"
        ? items.data.filter((item) => ["approved", "draft_on_platform", "notified"].includes(item.state))
        : getMockApprovalItems(),
    dataSource: items.dataSource,
  };
}

export async function getContentItemById(id: string) {
  const fallback = getMockItemById(id) ?? null;
  const result = await safeDb(async () => {
    const item = await prisma.contentItem.findUnique({
      where: { id },
      include: {
        business: true,
        currentVersion: true,
        reviewRecords: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        auditEvents: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    return item ? mapContentItem(item, item.business.slug) : null;
  }, fallback);

  return result;
}

export async function getActivityEvents(slug = "nelsonai") {
  const fallback = mockActivityEvents;
  const result = await safeDb(async () => {
    const business = await prisma.business.findUnique({
      where: { slug },
      include: {
        auditEvents: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!business) {
      return [];
    }

    return business.auditEvents.map((event): ActivityEvent => {
      const kind =
        event.action.includes("heartbeat")
          ? "heartbeat"
          : event.action.includes("review")
            ? "review"
            : event.action.includes("draft")
              ? "draft"
              : event.action.includes("spawn")
                ? "spawn"
                : event.action.includes("alert")
                  ? "alert"
                  : "complete";

      const details =
        event.details && typeof event.details === "object" && !Array.isArray(event.details)
          ? JSON.stringify(event.details)
          : "No extra detail recorded.";

      return {
        id: event.id,
        timestamp: formatDateTime(event.createdAt),
        agent: event.actor,
        kind,
        summary: event.action,
        detail: details,
        business: business.name,
      };
    });
  }, fallback);

  return result;
}

export async function getAnalyticsMetrics(slug = "nelsonai") {
  const result = await safeDb(async () => {
    const business = await prisma.business.findUnique({ where: { slug } });

    if (!business) {
      return [];
    }

    const [snapshots, approvalCount, reviews] = await Promise.all([
      prisma.analyticsSnapshot.findMany({
        where: {
          businessId: business.id,
          snapshotDate: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.contentItem.count({
        where: {
          businessId: business.id,
          state: {
            in: ["approved", "draft_on_platform", "notified"],
          },
        },
      }),
      prisma.reviewRecord.findMany({
        where: {
          contentItem: { businessId: business.id },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    const totals = snapshots.reduce(
      (acc, snapshot) => ({
        reach: acc.reach + (snapshot.reach ?? snapshot.impressions ?? 0),
        impressions: acc.impressions + (snapshot.impressions ?? 0),
        clicks: acc.clicks + (snapshot.clicks ?? 0),
      }),
      { reach: 0, impressions: 0, clicks: 0 },
    );

    const passCount = reviews.filter((review) => review.outcome === "pass").length;
    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const passRate = reviews.length > 0 ? (passCount / reviews.length) * 100 : 0;

    return [
      { label: "Weekly reach", value: totals.reach.toLocaleString(), delta: snapshots.length ? "Live data" : "No snapshots" },
      { label: "CTR to site", value: `${ctr.toFixed(1)}%`, delta: totals.clicks ? `${totals.clicks} clicks` : "No clicks" },
      { label: "Drafts awaiting posting", value: String(approvalCount), delta: approvalCount ? "Needs review" : "Queue clear" },
      { label: "Review pass rate", value: `${passRate.toFixed(0)}%`, delta: reviews.length ? `${reviews.length} reviews` : "No reviews" },
    ] satisfies AnalyticsMetric[];
  }, mockAnalyticsMetrics);

  return result;
}

export async function getCalendarEntries(slug = "nelsonai") {
  const items = await getContentItems(slug);

  if (items.dataSource === "mock") {
    return { data: mockWeeklyCalendar, dataSource: "mock" as const };
  }

  const grouped = new Map<string, CalendarEntry>();

  for (const item of items.data) {
    if (!item.scheduledDate) {
      continue;
    }

    const key = item.scheduledDate;
    if (!grouped.has(key)) {
      const parsed = new Date(`${key}, ${new Date().getFullYear()}`);
      grouped.set(key, {
        day: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(parsed),
        date: key,
        items: [],
      });
    }

    grouped.get(key)?.items.push({
      id: item.id,
      title: item.title,
      platform: item.platform,
      state: item.state,
    });
  }

  return { data: Array.from(grouped.values()), dataSource: "database" as const };
}

export async function getSettingsChecks(slug = "nelsonai") {
  const business = await getBusiness(slug);
  const result = await safeDb(async () => {
    const dbState = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT now()`;

    return [
      { label: "Database", value: dbState.length ? "Connected" : "Unreachable", tone: dbState.length ? "success" : "warning" },
      {
        label: "LinkedIn publisher",
        value: process.env.LINKEDIN_ACCESS_TOKEN ? "Token configured" : "Missing token",
        tone: process.env.LINKEDIN_ACCESS_TOKEN ? "success" : "warning",
      },
      {
        label: "Facebook publisher",
        value: process.env.FACEBOOK_PAGE_ACCESS_TOKEN ? "Token configured" : "Missing token",
        tone: process.env.FACEBOOK_PAGE_ACCESS_TOKEN ? "success" : "warning",
      },
      {
        label: "Telegram notifier",
        value: process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID ? "Configured" : "Missing config",
        tone: process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID ? "success" : "warning",
      },
      {
        label: "Admin auth",
        value: process.env.ADMIN_SECRET ? "Protected" : "Open in dev mode",
        tone: process.env.ADMIN_SECRET ? "success" : "neutral",
      },
    ] satisfies SettingsCheck[];
  }, mockSettingsChecks);

  return {
    business: business.business,
    checks: result.data,
    dataSource: result.dataSource,
  };
}

export async function getBrandProfile(slug = "nelsonai") {
  const business = await getBusiness(slug);
  const result = await safeDb(async () => {
    const record = await prisma.business.findUnique({
      where: { slug },
      include: {
        brandProfiles: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return record?.brandProfiles[0]?.profile ?? null;
  }, null);

  return {
    business: business.business,
    profile: result.data,
    dataSource: result.dataSource,
  };
}

export function getAvailableTransitions(state: ContentState) {
  return PIPELINE_STATE_ORDER.filter((candidate) => canTransition(state, candidate)).map((candidate) => ({
    value: candidate,
    label: STATE_LABELS[candidate],
  }));
}
