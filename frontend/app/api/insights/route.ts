import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getDiscoveryFeed, getProductivityInsights } from "@/lib/insights";

export async function GET(req: Request) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "insights";

  if (type === "discover") {
    const feed = await getDiscoveryFeed(session.id);
    return NextResponse.json(feed);
  }

  const insights = await getProductivityInsights(session.id);
  return NextResponse.json(insights);
}
