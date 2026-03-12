import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { isAuthorizedRequest, unauthorizedResponse } from "@/lib/auth";
import { getContentItems } from "@/lib/marketing-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("business_slug") ?? "nelsonai";
  const state = searchParams.get("state");
  const platform = searchParams.get("platform");

  const items = await getContentItems(slug);
  const filtered = items.data.filter((item) => {
    if (state && item.state !== state) {
      return false;
    }

    if (platform && item.platform !== platform) {
      return false;
    }

    return true;
  });

  return NextResponse.json({ items: filtered, dataSource: items.dataSource });
}

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse();
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const body = await request.json();
  const item = await prisma.contentItem.create({
    data: {
      businessId: body.businessId,
      platform: body.platform,
      state: body.state ?? "planned",
      campaignTheme: body.campaignTheme ?? null,
      brief: body.brief ?? {},
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
      priority: body.priority ?? "normal",
    },
  });

  await prisma.auditEvent.create({
    data: {
      businessId: item.businessId,
      contentItemId: item.id,
      actor: body.actor ?? "system",
      action: "content_item_created",
      toState: item.state,
      details: body,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
