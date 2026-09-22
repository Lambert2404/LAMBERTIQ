import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProviderConfigs } from "@/lib/db";
import { getAdapter } from "@/lib/ai/manager";

// Read → public-safe status snapshot (no keys). Write → admin only, persists to DB.
export async function GET() {
  const rows = getProviderConfigs().map((c) => ({
    provider: c.id, model: c.model, status: c.enabled ? "Active" : "Disabled",
    priority: c.priority, freeTier: c.freeTier, dailyLimit: c.dailyLimit,
    requestsUsed: c.requestsUsed, lastError: c.lastError || null,
    configured: getAdapter(c.id)?.isConfigured() ?? false
  }));
  return NextResponse.json({ providers: rows });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { id, enabled, priority, dailyLimit, model, resetUsage } = await req.json();
  const { run } = await import("@/lib/db");
  const sets: string[] = [];
  const args: any[] = [];
  if (typeof enabled === "boolean") { sets.push("enabled=?"); args.push(enabled ? 1 : 0); }
  if (typeof priority === "number") { sets.push("priority=?"); args.push(priority); }
  if (typeof dailyLimit === "number") { sets.push("daily_limit=?"); args.push(dailyLimit); }
  if (typeof model === "string" && model.trim()) { sets.push("model=?"); args.push(model.trim()); }
  if (resetUsage) { sets.push("requests_used=0"); }
  if (sets.length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  args.push(id);
  run(`UPDATE ai_providers SET ${sets.join(", ")} WHERE id=?`, ...args);
  return NextResponse.json({ ok: true });
}