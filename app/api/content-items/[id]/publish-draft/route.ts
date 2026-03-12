import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { isAuthorizedRequest, unauthorizedResponse } from "@/lib/auth";
import { invokeMarketingOpsSkill } from "@/lib/openclaw-runtime";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse();
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const { id } = await params;
  const item = await prisma.contentItem.findUnique({
    where: { id },
    include: {
      currentVersion: true,
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!item.currentVersion) {
    return NextResponse.json({ error: "Current draft version is missing." }, { status: 400 });
  }

  const supportedPlatforms = new Set(["linkedin", "facebook"]);
  if (!supportedPlatforms.has(item.platform)) {
    return NextResponse.json({ error: `Unsupported publishing platform: ${item.platform}` }, { status: 400 });
  }

  const publishResult = await invokeMarketingOpsSkill(`${item.platform}-publisher`, "create-draft", {
    "content-item-id": item.id,
  });

  if (!publishResult.ok) {
    return NextResponse.json(
      {
        error: publishResult.error ?? "Draft publishing failed.",
        executionMode: "skill",
        source: publishResult.source,
      },
      { status: 502 },
    );
  }

  const notificationResult = await invokeMarketingOpsSkill("telegram-notifier", "send", {
    "event-type": "draft_ready",
    "content-item-id": item.id,
  });

  if (!notificationResult.ok) {
    await prisma.auditEvent.create({
      data: {
        businessId: item.businessId,
        contentItemId: item.id,
        actor: "openclaw-runtime",
        action: "notification_failed",
        details: {
          error: notificationResult.error,
          source: notificationResult.source,
        },
      },
    });
  }

  const [updated, publication, notification] = await Promise.all([
    prisma.contentItem.findUnique({
      where: { id: item.id },
    }),
    prisma.platformPublication.findFirst({
      where: { contentItemId: item.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.notificationEvent.findFirst({
      where: { contentItemId: item.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    item: updated,
    publication,
    notification,
    notificationResult: notificationResult.ok
      ? { ok: true, source: notificationResult.source }
      : { ok: false, source: notificationResult.source, error: notificationResult.error },
    executionMode: "skill",
    source: publishResult.source,
  });
}
