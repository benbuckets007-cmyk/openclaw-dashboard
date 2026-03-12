import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { isAuthorizedRequest, unauthorizedResponse } from "@/lib/auth";
import { invokeMarketingOpsSkill } from "@/lib/openclaw-runtime";

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse();
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const body = await request.json();
  const item = await prisma.contentItem.findUnique({
    where: { id: body.contentItemId },
  });

  if (!item) {
    return NextResponse.json({ error: "Content item not found." }, { status: 404 });
  }

  const platformPostId = body.platformPostId ?? item.platformPostId ?? item.platformDraftId;
  if (!platformPostId) {
    return NextResponse.json({ error: "No platform identifier available for analytics collection." }, { status: 400 });
  }

  const snapshotDate = body.snapshotDate ? new Date(body.snapshotDate) : new Date();
  snapshotDate.setHours(0, 0, 0, 0);

  const collectResult = await invokeMarketingOpsSkill("analytics-collector", "collect", {
    "content-item-id": item.id,
    "business-id": item.businessId,
    "platform-post-id": platformPostId,
    "snapshot-date": snapshotDate.toISOString().slice(0, 10),
    "transition-state": "false",
  });

  if (!collectResult.ok) {
    return NextResponse.json(
      {
        error: collectResult.error ?? "Analytics collection failed.",
        executionMode: "skill",
        source: collectResult.source,
      },
      { status: 502 },
    );
  }

  const created = await prisma.analyticsSnapshot.findUnique({
    where: {
      contentItemId_snapshotDate: {
        contentItemId: item.id,
        snapshotDate,
      },
    },
  });

  return NextResponse.json(
    {
      snapshot: created,
      executionMode: "skill",
      source: collectResult.source,
    },
    { status: 201 },
  );
}
