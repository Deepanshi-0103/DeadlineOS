import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { buildSmartAlerts, listAlertRules, updateAlertRule } from "@/lib/alerts";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [rules, alerts] = await Promise.all([
    listAlertRules(session.id),
    buildSmartAlerts(session.id),
  ]);
  return NextResponse.json({ rules, alerts });
}

export async function PATCH(req: Request) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const rule = await updateAlertRule(session.id, body.id, body);
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ rule });
}
