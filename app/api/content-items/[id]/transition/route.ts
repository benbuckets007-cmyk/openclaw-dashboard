import { NextResponse } from "next/server";
import type { ContentState } from "@/types/content";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { isAuthorizedRequest, unauthorizedResponse } from "@/lib/auth";
import { canTransition } from "@/lib/state-machine";

function getStateTimestampField(state: ContentState) {
  switch (state) {
    case "briefed":
      return "briefedAt";
    case "draft_on_platform":
      return "publishedDraftAt";
    case "approved":
      return "approvedAt";
    case "posted":
      return "postedAt";
    case "analyzed":
      return "analyzedAt";
    default:
      return null;
  }
}

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
  const body = await request.json();
  const nextState = body.to_state as ContentState;

  const item = await prisma.contentItem.findUnique({ where: { id } });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canTransition(item.state as ContentState, nextState)) {
    return NextResponse.json(
      { error: `Invalid transition: ${item.state} -> ${nextState}` },
      { status: 400 },
    );
  }

  const timestampField = getStateTimestampField(nextState);
  const data: Record<string, unknown> = {
    state: nextState,
  };

  if (timestampField) {
    data[timestampField] = new Date();
  }

  if (nextState === "posted" && body.platformPostUrl) {
    data.platformPostUrl = body.platformPostUrl;
  }

  const updated = await prisma.contentItem.update({
    where: { id },
    data,
  });

  await prisma.auditEvent.create({
    data: {
      businessId: item.businessId,
      contentItemId: item.id,
      actor: body.actor ?? "ben",
      action: "state_transition",
      fromState: item.state,
      toState: nextState,
      details: body.details ?? {},
    },
  });

  return NextResponse.json(updated);
}
