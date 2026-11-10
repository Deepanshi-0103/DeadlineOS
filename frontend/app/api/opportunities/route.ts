import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import {
  computeStats,
  createOpportunityForUser,
  listOpportunitiesForUser,
  organizerFromUrl,
  titleFromUrl,
} from "@/lib/opportunities";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const opportunities = await listOpportunitiesForUser(session.id);
    const stats = computeStats(opportunities);

    return NextResponse.json({ opportunities, stats });
  } catch (err: unknown) {
    console.error("[opportunities GET]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const sourceUrl =
      typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";

    let title =
      typeof body.title === "string" ? body.title.trim() : "";
    let organizer =
      typeof body.organizer === "string" ? body.organizer.trim() : "";

    // Convenience: paste-only URL capture
    if (!title && sourceUrl) {
      title = titleFromUrl(sourceUrl);
    }
    if (!organizer && sourceUrl) {
      organizer = organizerFromUrl(sourceUrl);
    }

    if (!title) {
      return NextResponse.json(
        { error: "Title is required (or provide a sourceUrl)." },
        { status: 400 }
      );
    }

    const opportunity = await createOpportunityForUser(session.id, {
      title,
      organizer: organizer || "Unknown",
      category: body.category,
      reward: body.reward,
      deadline: body.deadline,
      status: body.status,
      sourceUrl: sourceUrl || null,
    });

    return NextResponse.json({ success: true, opportunity }, { status: 201 });
  } catch (err: unknown) {
    console.error("[opportunities POST]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
