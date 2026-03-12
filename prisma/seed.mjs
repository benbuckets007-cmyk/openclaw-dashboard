import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const business = await prisma.business.upsert({
    where: { slug: "nelsonai" },
    update: {
      name: "NelsonAI",
      timezone: "Pacific/Auckland",
      enabledPlatforms: ["linkedin", "facebook"],
      postingCadence: {
        linkedin: { posts_per_week: 3 },
        facebook: { posts_per_week: 2 },
      },
      brandProfilePath: "~/.openclaw/workspaces/marketing-ops/businesses/nelsonai/brand-profile.md",
    },
    create: {
      name: "NelsonAI",
      slug: "nelsonai",
      timezone: "Pacific/Auckland",
      enabledPlatforms: ["linkedin", "facebook"],
      postingCadence: {
        linkedin: { posts_per_week: 3 },
        facebook: { posts_per_week: 2 },
      },
      brandProfilePath: "~/.openclaw/workspaces/marketing-ops/businesses/nelsonai/brand-profile.md",
    },
  });

  await prisma.brandProfile.create({
    data: {
      businessId: business.id,
      version: 1,
      profile: {
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
      },
    },
  });

  const contentItem = await prisma.contentItem.upsert({
    where: {
      id: "11111111-1111-4111-8111-111111111111",
    },
    update: {
      businessId: business.id,
      platform: "linkedin",
      state: "draft_on_platform",
      campaignTheme: "Leadership readiness",
      brief: {
        topic: "Why CFOs need AI literacy in 2026",
        target_audience: "Finance leaders and operators",
        key_message: "Finance leaders need enough AI fluency to assess operational risk and opportunity.",
        cta: "Book an intro call",
      },
      scheduledDate: new Date("2026-03-17"),
      priority: "high",
      platformDraftUrl: "https://example.com/linkedin/draft/cfo-literacy",
    },
    create: {
      id: "11111111-1111-4111-8111-111111111111",
      businessId: business.id,
      platform: "linkedin",
      state: "draft_on_platform",
      campaignTheme: "Leadership readiness",
      brief: {
        topic: "Why CFOs need AI literacy in 2026",
        target_audience: "Finance leaders and operators",
        key_message: "Finance leaders need enough AI fluency to assess operational risk and opportunity.",
        cta: "Book an intro call",
      },
      scheduledDate: new Date("2026-03-17"),
      priority: "high",
      briefedAt: new Date(),
      firstDraftAt: new Date(),
      approvedAt: new Date(),
      publishedDraftAt: new Date(),
      platformDraftUrl: "https://example.com/linkedin/draft/cfo-literacy",
    },
  });

  const version = await prisma.contentVersion.upsert({
    where: {
      contentItemId_versionNumber: {
        contentItemId: contentItem.id,
        versionNumber: 1,
      },
    },
    update: {
      body: "AI literacy for finance leaders is not about prompting tricks. It is about understanding where workflows change, where controls break, and where margin improves.",
      headline: "Why CFOs need AI literacy in 2026",
      visualNotes: "Confident executive portrait with workflow diagram overlay.",
      altHooks: [
        "Your CFO does not need to code. They do need to recognize where AI creates exposure.",
        "AI risk usually enters through process, not prompts.",
      ],
      metadata: {
        word_count: 247,
      },
      createdBy: "content-writer",
    },
    create: {
      contentItemId: contentItem.id,
      versionNumber: 1,
      body: "AI literacy for finance leaders is not about prompting tricks. It is about understanding where workflows change, where controls break, and where margin improves.",
      headline: "Why CFOs need AI literacy in 2026",
      visualNotes: "Confident executive portrait with workflow diagram overlay.",
      altHooks: [
        "Your CFO does not need to code. They do need to recognize where AI creates exposure.",
        "AI risk usually enters through process, not prompts.",
      ],
      metadata: {
        word_count: 247,
      },
      createdBy: "content-writer",
      modelUsed: "anthropic/claude-sonnet-4-20250514",
    },
  });

  await prisma.contentItem.update({
    where: { id: contentItem.id },
    data: {
      currentVersionId: version.id,
    },
  });

  await prisma.reviewRecord.create({
    data: {
      contentItemId: contentItem.id,
      contentVersionId: version.id,
      outcome: "pass",
      brandFit: true,
      claimSafety: true,
      platformFit: true,
      clarityScore: 4,
      confidence: "high",
      reviewerAgent: "reviewer",
      modelUsed: "anthropic/claude-sonnet-4-20250514",
    },
  });

  await prisma.auditEvent.createMany({
    data: [
      {
        businessId: business.id,
        contentItemId: contentItem.id,
        actor: "orchestrator",
        action: "brief_created",
        toState: "briefed",
        details: { source: "seed" },
      },
      {
        businessId: business.id,
        contentItemId: contentItem.id,
        actor: "content-writer",
        action: "draft_created",
        toState: "draft_ready",
        details: { source: "seed" },
      },
      {
        businessId: business.id,
        contentItemId: contentItem.id,
        actor: "reviewer",
        action: "review_completed",
        toState: "approved",
        details: { outcome: "pass", source: "seed" },
      },
    ],
  });

  await prisma.analyticsSnapshot.create({
    data: {
      businessId: business.id,
      contentItemId: contentItem.id,
      platform: "linkedin",
      snapshotDate: new Date("2026-03-10"),
      impressions: 8400,
      clicks: 392,
      likes: 114,
      comments: 23,
      shares: 11,
      reach: 7900,
      engagementRate: "0.0640",
      insights: "Leadership-readiness content is outperforming generic AI updates.",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
