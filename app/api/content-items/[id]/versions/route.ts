import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { isAuthorizedRequest, unauthorizedResponse } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ versions: [] });
  }

  const { id } = await params;
  const versions = await prisma.contentVersion.findMany({
    where: { contentItemId: id },
    orderBy: { versionNumber: "desc" },
  });

  return NextResponse.json({ versions });
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
  const latestVersion = await prisma.contentVersion.findFirst({
    where: { contentItemId: id },
    orderBy: { versionNumber: "desc" },
  });

  const version = await prisma.contentVersion.create({
    data: {
      contentItemId: id,
      versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
      body: body.body,
      headline: body.headline ?? null,
      visualNotes: body.visualNotes ?? null,
      altHooks: body.altHooks ?? [],
      metadata: body.metadata ?? {},
      createdBy: body.createdBy ?? "system",
      modelUsed: body.modelUsed ?? null,
      promptTokens: body.promptTokens ?? null,
      completionTokens: body.completionTokens ?? null,
    },
  });

  await prisma.contentItem.update({
    where: { id },
    data: {
      currentVersionId: version.id,
      firstDraftAt: latestVersion ? undefined : new Date(),
    },
  });

  await prisma.auditEvent.create({
    data: {
      contentItemId: id,
      actor: body.createdBy ?? "system",
      action: "draft_created",
      details: { versionNumber: version.versionNumber },
    },
  });

  return NextResponse.json(version, { status: 201 });
}
