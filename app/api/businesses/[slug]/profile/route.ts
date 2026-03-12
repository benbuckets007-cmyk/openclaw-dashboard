import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { isAuthorizedRequest, unauthorizedResponse } from "@/lib/auth";
import { getBrandProfile } from "@/lib/marketing-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const profile = await getBrandProfile(slug);
  return NextResponse.json(profile);
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
  const business = await prisma.business.findUnique({
    where: { slug },
    include: {
      brandProfiles: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  if (business.brandProfiles[0]) {
    const updated = await prisma.brandProfile.update({
      where: { id: business.brandProfiles[0].id },
      data: { profile: body.profile },
    });
    return NextResponse.json(updated);
  }

  const created = await prisma.brandProfile.create({
    data: {
      businessId: business.id,
      profile: body.profile,
      isActive: true,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
