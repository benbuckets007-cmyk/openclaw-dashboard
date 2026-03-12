import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { canTransition } from "@/lib/state-machine";
import { isTelegramWebhookAuthorized, parseTelegramCallbackData } from "@/lib/telegram";

export async function POST(request: Request) {
  if (!isTelegramWebhookAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized Telegram webhook." }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: true, skipped: "DATABASE_URL missing" });
  }

  const body = await request.json();
  const callback = parseTelegramCallbackData(body?.callback_query?.data);

  if (!callback) {
    return NextResponse.json({ ok: true, skipped: "No callback action" });
  }

  if (callback.action !== "mark_posted") {
    return NextResponse.json({ ok: true, skipped: "Unsupported action" });
  }

  const item = await prisma.contentItem.findUnique({
    where: { id: callback.contentItemId },
  });

  if (!item) {
    return NextResponse.json({ error: "Content item not found." }, { status: 404 });
  }

  if (!canTransition(item.state, "posted")) {
    return NextResponse.json(
      { error: `Content item cannot transition from ${item.state} to posted.` },
      { status: 400 },
    );
  }

  const updated = await prisma.contentItem.update({
    where: { id: item.id },
    data: {
      state: "posted",
      postedAt: new Date(),
    },
  });

  await prisma.auditEvent.create({
    data: {
      businessId: item.businessId,
      contentItemId: item.id,
      actor: "telegram",
      action: "manual_post_confirmed",
      fromState: item.state,
      toState: "posted",
      details: body,
    },
  });

  return NextResponse.json({ ok: true, item: updated });
}
