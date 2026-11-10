import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import {
  deleteOpportunityForUser,
  updateOpportunityForUser,
} from "@/lib/opportunities";

interface RouteContext {
  params: { id: string };
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const opportunity = await updateOpportunityForUser(session.id, params.id, {
      title:           body.title,
      organizer:       body.organizer,
      category:        body.category,
      reward:          body.reward,
      deadline:        body.deadline,
      status:          body.status,
      priority:        body.priority,
      sourceUrl:       body.sourceUrl,
      summary:         body.summary,
      eligibility:     body.eligibility,
      registrationUrl: body.registrationUrl,
      // Explicitly accepting needsReview: false clears the "Needs Review" tag
      needsReview:     typeof body.needsReview === "boolean" ? body.needsReview : undefined,
    });

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, opportunity });
  } catch (err: unknown) {
    console.error("[opportunities PATCH]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ok = await deleteOpportunityForUser(session.id, params.id);
    if (!ok) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[opportunities DELETE]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
