import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { isAuthorizedRequest, unauthorizedResponse } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contentItemId = searchParams.get("content_item_id");

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ reviews: [] });
  }

  const reviews = await prisma.reviewRecord.findMany({
    where: {
      ...(contentItemId ? { contentItemId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ reviews });
}

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse();
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const body = await request.json();

  const review = await prisma.reviewRecord.create({
    data: {
      contentVersionId: body.contentVersionId,
      contentItemId: body.contentItemId,
      outcome: body.outcome,
      brandFit: body.brandFit ?? null,
      claimSafety: body.claimSafety ?? null,
      platformFit: body.platformFit ?? null,
      clarityScore: body.clarityScore ?? null,
      revisionNotes: body.revisionNotes ?? null,
      riskFlags: body.riskFlags ?? [],
      confidence: body.confidence ?? null,
      reviewerAgent: body.reviewerAgent ?? "reviewer",
      modelUsed: body.modelUsed ?? null,
      promptTokens: body.promptTokens ?? null,
      completionTokens: body.completionTokens ?? null,
    },
  });

  await prisma.auditEvent.create({
    data: {
      contentItemId: body.contentItemId,
      actor: body.reviewerAgent ?? "reviewer",
      action: "review_completed",
      details: {
        outcome: body.outcome,
        confidence: body.confidence ?? null,
      },
    },
  });

  return NextResponse.json(review, { status: 201 });
}
