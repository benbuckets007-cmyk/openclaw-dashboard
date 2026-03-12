import type {
  ActivityEvent,
  AnalyticsMetric,
  BusinessProfile,
  CalendarEntry,
  ContentItem,
  ContentState,
} from "@/types/content";

export const business: BusinessProfile = {
  id: "biz_nelsonai",
  name: "NelsonAI",
  slug: "nelsonai",
  timezone: "Pacific/Auckland",
  audience: "Founders, operators, and finance leaders at SMBs adopting AI deliberately.",
  tone: "Direct, practical, credible, and anti-hype.",
  positioning: "AI operating partner for businesses that need usable systems, not vague transformation theater.",
  complianceRules: [
    "Avoid unverifiable performance claims.",
    "Keep advice operational and specific.",
    "Never imply autonomous posting or fully hands-off AI execution.",
  ],
  contentPillars: [
    "AI literacy for leaders",
    "Operational workflow redesign",
    "Risk-aware implementation",
    "Case-study style proof points",
  ],
};

export const contentItems: ContentItem[] = [
  {
    id: "item-cfo-literacy",
    title: "Why CFOs need AI literacy in 2026",
    platform: "linkedin",
    scheduledDate: "Mar 17",
    campaignTheme: "Leadership readiness",
    topic: "Executive AI literacy",
    state: "approved",
    priority: "high",
    brief: "Show why finance leaders need enough AI fluency to evaluate operational risk and opportunity without becoming builders.",
    hook: "Your CFO does not need to code. They do need to recognize where AI can quietly create exposure.",
    cta: "Book an intro call",
    draftUrl: "https://example.com/draft/cfo-literacy",
    platformUrl: "https://linkedin.example.com/draft/cfo-literacy",
    currentVersion: {
      id: "ver-1",
      label: "Version 1",
      wordCount: 247,
      hook: "Your CFO does not need to code. They do need to recognize where AI can quietly create exposure.",
      cta: "Book an intro call",
      excerpt:
        "AI literacy for finance leaders is not about prompting tricks. It is about understanding where workflows change, where controls break, and where margin improves.",
    },
    review: {
      verdict: "PASS",
      confidence: "high",
      reviewer: "Reviewer",
      createdAt: "12:10 PM",
    },
    audit: [
      {
        id: "audit-1",
        actor: "Orchestrator",
        action: "Brief created",
        timestamp: "9:20 AM",
        detail: "Generated a LinkedIn brief for leadership readiness series.",
      },
      {
        id: "audit-2",
        actor: "Content Writer",
        action: "Draft completed",
        timestamp: "10:48 AM",
        detail: "Produced LinkedIn draft with two alternate hooks.",
      },
      {
        id: "audit-3",
        actor: "Reviewer",
        action: "Review passed",
        timestamp: "12:10 PM",
        detail: "Marked ready for approval with high confidence.",
      },
    ],
  },
  {
    id: "item-opportunity-snapshot",
    title: "AI opportunity snapshot for operators",
    platform: "linkedin",
    scheduledDate: "Mar 18",
    campaignTheme: "Opportunity mapping",
    topic: "Operational bottlenecks",
    state: "planned",
    priority: "normal",
    brief: "Outline a repeatable framework for spotting small high-return AI opportunities inside service businesses.",
    hook: "Most AI roadmaps are too big to survive first contact with the business.",
    cta: "Request the worksheet",
    currentVersion: {
      id: "ver-2",
      label: "Brief only",
      wordCount: 0,
      hook: "Most AI roadmaps are too big to survive first contact with the business.",
      cta: "Request the worksheet",
      excerpt: "Awaiting content writer draft generation.",
    },
    review: {
      verdict: "REVISE",
      confidence: "low",
      reviewer: "Reviewer",
      createdAt: "Pending",
      note: "Draft not yet available.",
    },
    audit: [
      {
        id: "audit-4",
        actor: "Orchestrator",
        action: "Queued for drafting",
        timestamp: "8:10 AM",
        detail: "Scheduled for next LinkedIn slot in weekly plan.",
      },
    ],
  },
  {
    id: "item-facebook-team-ready",
    title: "3 signs your team is ready for AI",
    platform: "facebook",
    scheduledDate: "Mar 15",
    campaignTheme: "Readiness signals",
    topic: "Team adoption",
    state: "draft_on_platform",
    priority: "high",
    brief: "Make readiness feel tangible with operational signals, not culture slogans.",
    hook: "Most teams think they are not ready. Usually they just lack one honest workflow audit.",
    cta: "Download checklist",
    draftUrl: "https://example.com/draft/team-ready",
    platformUrl: "https://facebook.example.com/draft/team-ready",
    reviewerNote: "Medium confidence. CTA could be stronger.",
    currentVersion: {
      id: "ver-3",
      label: "Version 2",
      wordCount: 211,
      hook: "Most teams think they are not ready. Usually they just lack one honest workflow audit.",
      cta: "Download checklist",
      excerpt:
        "Readiness is visible before tooling changes. Teams document decisions, name bottlenecks clearly, and are willing to tighten messy handoffs.",
    },
    review: {
      verdict: "PASS",
      confidence: "medium",
      reviewer: "Reviewer",
      createdAt: "11:32 AM",
      note: "CTA could be stronger if performance stalls.",
    },
    audit: [
      {
        id: "audit-5",
        actor: "Content Writer",
        action: "Draft revised",
        timestamp: "10:56 AM",
        detail: "Strengthened examples after revise verdict.",
      },
      {
        id: "audit-6",
        actor: "Reviewer",
        action: "Review passed",
        timestamp: "11:32 AM",
        detail: "Approved version 2 with medium confidence.",
      },
      {
        id: "audit-7",
        actor: "Facebook Publisher",
        action: "Draft created on platform",
        timestamp: "11:45 AM",
        detail: "Created unpublished Facebook post draft.",
      },
    ],
  },
  {
    id: "item-facebook-stop-doing-this",
    title: "Stop doing this to your Facebook process",
    platform: "facebook",
    scheduledDate: "Mar 14",
    campaignTheme: "Workflow friction",
    topic: "Publishing chaos",
    state: "in_review",
    priority: "normal",
    brief: "Explain the hidden cost of improvising every post from scratch.",
    hook: "If every post starts with a blank page, the problem is not creativity. It is your operating system.",
    cta: "See the process map",
    currentVersion: {
      id: "ver-4",
      label: "Version 1",
      wordCount: 238,
      hook: "If every post starts with a blank page, the problem is not creativity. It is your operating system.",
      cta: "See the process map",
      excerpt:
        "A repeatable social workflow protects quality. It gives your team a brief, a review pass, and a clear handoff before anything gets near publish.",
    },
    review: {
      verdict: "REVISE",
      confidence: "medium",
      reviewer: "Reviewer",
      createdAt: "12:10 PM",
      note: "Paragraph two includes a claim that needs support.",
    },
    reviewerNote: "Claim in paragraph two needs support.",
    audit: [
      {
        id: "audit-8",
        actor: "Content Writer",
        action: "Draft completed",
        timestamp: "12:15 PM",
        detail: "Sent version 1 to reviewer.",
      },
      {
        id: "audit-9",
        actor: "Reviewer",
        action: "Revision requested",
        timestamp: "12:18 PM",
        detail: "CTA too vague and one claim is unverifiable.",
      },
    ],
  },
  {
    id: "item-linkedin-hidden-cost",
    title: "The hidden cost of AI pilots",
    platform: "linkedin",
    scheduledDate: "Mar 13",
    campaignTheme: "Risk and governance",
    topic: "Pilot sprawl",
    state: "draft_on_platform",
    priority: "low",
    brief: "Warn against disconnected experiments that never convert into workflows.",
    hook: "The expensive part of an AI pilot is rarely the tool. It is the orphaned process it leaves behind.",
    cta: "Talk through your rollout",
    draftUrl: "https://example.com/draft/hidden-cost",
    platformUrl: "https://linkedin.example.com/draft/hidden-cost",
    currentVersion: {
      id: "ver-5",
      label: "Version 1",
      wordCount: 198,
      hook: "The expensive part of an AI pilot is rarely the tool. It is the orphaned process it leaves behind.",
      cta: "Talk through your rollout",
      excerpt:
        "Pilots fail when nobody owns the workflow after the experiment. Good AI work closes that gap before the first test starts.",
    },
    review: {
      verdict: "PASS",
      confidence: "high",
      reviewer: "Reviewer",
      createdAt: "9:55 AM",
    },
    audit: [
      {
        id: "audit-10",
        actor: "LinkedIn Publisher",
        action: "Draft created on platform",
        timestamp: "10:02 AM",
        detail: "Draft ready for manual posting.",
      },
    ],
  },
  {
    id: "item-facebook-saved-hours",
    title: "How we saved hours with workflow triage",
    platform: "facebook",
    scheduledDate: "Mar 18",
    campaignTheme: "Case-study style proof",
    topic: "Workflow triage",
    state: "planned",
    priority: "low",
    brief: "Use a case-study frame to show efficiency from better triage, not magic automation.",
    hook: "Most time savings show up before you automate anything at all.",
    cta: "Ask for the audit template",
    currentVersion: {
      id: "ver-6",
      label: "Brief only",
      wordCount: 0,
      hook: "Most time savings show up before you automate anything at all.",
      cta: "Ask for the audit template",
      excerpt: "Awaiting draft.",
    },
    review: {
      verdict: "REVISE",
      confidence: "low",
      reviewer: "Reviewer",
      createdAt: "Pending",
      note: "Draft not yet available.",
    },
    audit: [
      {
        id: "audit-11",
        actor: "Orchestrator",
        action: "Planned",
        timestamp: "7:40 AM",
        detail: "Added to weekly backlog for Facebook.",
      },
    ],
  },
];

export const activityEvents: ActivityEvent[] = [
  {
    id: "evt-1",
    timestamp: "12:34 PM",
    agent: "Orchestrator",
    kind: "spawn",
    summary: 'Spawned Content Writer for "AI opportunity snapshot for operators"',
    detail: "Platform: LinkedIn · Business: NelsonAI",
    business: "NelsonAI",
    platform: "linkedin",
  },
  {
    id: "evt-2",
    timestamp: "12:33 PM",
    agent: "Orchestrator",
    kind: "heartbeat",
    summary: "Heartbeat check flagged one item in review for more than 6 hours",
    detail: "Alert routed to Approval Inbox and Telegram notifier.",
    business: "NelsonAI",
  },
  {
    id: "evt-3",
    timestamp: "12:15 PM",
    agent: "Content Writer",
    kind: "draft",
    summary: 'Draft completed for "Stop doing this to your Facebook process"',
    detail: "Version 1 · 238 words · 2 alternate hooks",
    business: "NelsonAI",
    platform: "facebook",
  },
  {
    id: "evt-4",
    timestamp: "12:10 PM",
    agent: "Reviewer",
    kind: "review",
    summary: 'Review: REVISE for "Stop doing this to your Facebook process"',
    detail: "Issue: CTA too vague, claim in paragraph 2 unverifiable.",
    business: "NelsonAI",
    platform: "facebook",
  },
  {
    id: "evt-5",
    timestamp: "11:45 AM",
    agent: "Orchestrator",
    kind: "complete",
    summary: "Heartbeat OK after morning pass",
    detail: "No other items need escalation.",
    business: "NelsonAI",
  },
];

export const analyticsMetrics: AnalyticsMetric[] = [
  { label: "Weekly reach", value: "28.4k", delta: "+18%" },
  { label: "CTR to site", value: "4.9%", delta: "+0.8 pts" },
  { label: "Drafts awaiting posting", value: "2", delta: "No change" },
  { label: "Review pass rate", value: "71%", delta: "+9%" },
];

export const weeklyCalendar: CalendarEntry[] = [
  {
    day: "Mon",
    date: "Mar 12",
    items: [{ id: "item-linkedin-hidden-cost", title: "The hidden cost of AI pilots", platform: "linkedin", state: "draft_on_platform" }],
  },
  {
    day: "Tue",
    date: "Mar 13",
    items: [{ id: "item-facebook-team-ready", title: "3 signs your team is ready for AI", platform: "facebook", state: "draft_on_platform" }],
  },
  {
    day: "Wed",
    date: "Mar 14",
    items: [{ id: "item-facebook-stop-doing-this", title: "Stop doing this to your Facebook process", platform: "facebook", state: "in_review" }],
  },
  {
    day: "Thu",
    date: "Mar 15",
    items: [{ id: "item-cfo-literacy", title: "Why CFOs need AI literacy in 2026", platform: "linkedin", state: "approved" }],
  },
  {
    day: "Fri",
    date: "Mar 16",
    items: [{ id: "item-opportunity-snapshot", title: "AI opportunity snapshot for operators", platform: "linkedin", state: "planned" }],
  },
];

export const stateOrder: ContentState[] = [
  "planned",
  "drafting",
  "in_review",
  "approved",
  "draft_on_platform",
  "posted",
];

export const stateLabels: Partial<Record<ContentState, string>> = {
  planned: "Planned",
  drafting: "Drafting",
  in_review: "In Review",
  approved: "Approved",
  draft_on_platform: "On Platform",
  posted: "Posted",
};

export const stateColors: Partial<Record<ContentState, string>> = {
  planned: "#4d7ba8",
  drafting: "#b8842a",
  in_review: "#bf6a1b",
  approved: "#2f6f56",
  draft_on_platform: "#7652b8",
  posted: "#5c676d",
};

export const settingsChecks = [
  { label: "Telegram notifier", value: "Connected", tone: "success" },
  { label: "LinkedIn publisher", value: "Needs token refresh in 11 days", tone: "warning" },
  { label: "Facebook publisher", value: "Connected", tone: "success" },
  { label: "Weekly planning cron", value: "Runs Mondays at 9:00 AM", tone: "neutral" },
];

export function getItemById(id: string) {
  return contentItems.find((item) => item.id === id);
}

export function getPipelineColumns(platform: string = "all") {
  return stateOrder.map((state) => ({
    state,
    label: stateLabels[state],
    items: contentItems.filter(
      (item) => item.state === state && (platform === "all" || item.platform === platform),
    ),
  }));
}

export function getApprovalItems() {
  return contentItems.filter((item) => item.state === "approved" || item.state === "draft_on_platform");
}
