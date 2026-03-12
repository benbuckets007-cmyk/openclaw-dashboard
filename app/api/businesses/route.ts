import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { isAuthorizedRequest, unauthorizedResponse } from "@/lib/auth";
import { getBusinesses } from "@/lib/marketing-data";

export async function GET() {
  const businesses = await getBusinesses();
  return NextResponse.json({
    businesses: businesses.data,
    dataSource: businesses.dataSource,
  });
}

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse();
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const body = await request.json();
  const business = await prisma.business.create({
    data: {
      name: body.name,
      slug: body.slug,
      timezone: body.timezone ?? "America/New_York",
      enabledPlatforms: body.enabledPlatforms ?? [],
      brandProfilePath: body.brandProfilePath ?? null,
      config: body.config ?? {},
      postingCadence: body.postingCadence ?? {},
    },
  });

  return NextResponse.json(business, { status: 201 });
}
