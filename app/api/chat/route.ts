import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { seed, saveMessage } from "@/lib/db";
import { rateLimit } from "@/lib/guard";
import { runChat } from "@/lib/engine";
import type { StudyMode, Language } from "@/lib/ai/types";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const uid = session?.user?.id || null;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    const limitKey = uid || ip;
    if (!rateLimit(`chat:${limitKey}`, 20)) {
      return NextResponse.json({ error: "Rate limit reached — try again in a minute." }, { status: 429 });
    }

    const body = await req.json();
    const { messages, mode = "ask", language = "en", subject, documentContext } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }
    seed();

    const payload = await runChat(
      { messages, mode: mode as StudyMode, language: language as Language, subject, documentContext },
      { userId: uid || undefined }
    );

    if (uid) {
      try {
        saveMessage(uid, "user", (messages[messages.length - 1] as any)?.content || "", mode, language);
        saveMessage(uid, "assistant", payload.final, mode, language);
      } catch { /* history best-effort */ }
    }
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}