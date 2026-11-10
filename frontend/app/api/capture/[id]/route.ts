import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getCaptureJobForUser } from "@/lib/capture";

interface RouteContext {
  params: { id: string };
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const job = await getCaptureJobForUser(session.id, params.id);
    if (!job) {
      return NextResponse.json({ error: "Capture job not found" }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (err: unknown) {
    console.error("[capture GET]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
