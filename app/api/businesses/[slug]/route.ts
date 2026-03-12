import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { isAuthorizedRequest, unauthorizedResponse } from "@/lib/auth";
import { getBusiness, getBusinessSettings } from "@/lib/marketing-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const [business, settings] = await Promise.all([getBusiness(slug), getBusinessSettings(slug)]);

  return NextResponse.json({
    business: business.business,
    settings: settings.data,
    dataSource: business.dataSource === "database" && settings.dataSource === "database" ? "database" : "mock",
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse();
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const { slug } = await params;
  const body = await request.json();

  const updated = await prisma.business.update({
    where: { slug },
    data: {
      timezone: body.timezone,
      postingCadence: body.postingCadence,
      notificationChannel: body.notificationChannel,
      analyticsCadence: body.analyticsCadence,
      config: body.config,
    },
  });

  return NextResponse.json(updated);
}
