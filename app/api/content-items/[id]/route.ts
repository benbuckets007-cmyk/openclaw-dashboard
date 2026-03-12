import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { isAuthorizedRequest, unauthorizedResponse } from "@/lib/auth";
import { getContentItemById } from "@/lib/marketing-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const item = await getContentItemById(id);

  if (!item.data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ item: item.data, dataSource: item.dataSource });
}

export async function PATCH(
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

  const updated = await prisma.contentItem.update({
    where: { id },
    data: {
      campaignTheme: body.campaignTheme,
      brief: body.brief,
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : undefined,
      priority: body.priority,
      platformDraftUrl: body.platformDraftUrl,
      platformPostUrl: body.platformPostUrl,
    },
  });

  return NextResponse.json(updated);
}
