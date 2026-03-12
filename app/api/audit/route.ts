import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contentItemId = searchParams.get("content_item_id");
  const businessId = searchParams.get("business_id");

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ events: [] });
  }

  const events = await prisma.auditEvent.findMany({
    where: {
      ...(contentItemId ? { contentItemId } : {}),
      ...(businessId ? { businessId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ events });
}
