import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { isAuthorizedRequest, unauthorizedResponse } from "@/lib/auth";
import { getAnalyticsMetrics } from "@/lib/marketing-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("business_slug") ?? "nelsonai";
  const metrics = await getAnalyticsMetrics(slug);
  return NextResponse.json({ metrics: metrics.data, dataSource: metrics.dataSource });
}

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse();
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const body = await request.json();
  const snapshot = await prisma.analyticsSnapshot.create({
    data: {
      contentItemId: body.contentItemId ?? null,
      businessId: body.businessId,
      platform: body.platform,
      snapshotDate: new Date(body.snapshotDate),
      impressions: body.impressions ?? null,
      clicks: body.clicks ?? null,
      likes: body.likes ?? null,
      comments: body.comments ?? null,
      shares: body.shares ?? null,
      saves: body.saves ?? null,
      engagementRate: body.engagementRate ?? null,
      reach: body.reach ?? null,
      rawData: body.rawData ?? null,
      insights: body.insights ?? null,
    },
  });

  return NextResponse.json(snapshot, { status: 201 });
}
