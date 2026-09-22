import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { retrieveChunks } from "@/lib/parsers";
import { all, scalar } from "@/lib/db";
import { runChat } from "@/lib/engine";
import type { ChatMessage } from "@/lib/ai/types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { documentId, question } = await req.json();
  if (!documentId || !question?.trim()) return NextResponse.json({ error: "documentId and question required" }, { status: 400 });

  const doc = scalar<any>("SELECT id,filename FROM documents WHERE id=? AND user_id=?", documentId, session.user.id);
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const chunks = all<{ id: string; text: string }>("SELECT id,text FROM document_chunks WHERE document_id=? ORDER BY chunk_index", documentId);
  const top = retrieveChunks(chunks, question, 3);
  if (top.length === 0) return NextResponse.json({ final: "No relevant content found in the document." });

  const context = top.map((c) => c.text).join("\n\n…\n\n");
  const messages: ChatMessage[] = [{ role: "user", content: question }];
  const payload = await runChat({ messages, mode: "document-qa", language: "en", subject: doc.filename, documentContext: context }, { userId: session.user.id });

  return NextResponse.json({
    ...payload,
    usedChunks: top.map((c) => ({ score: Math.round(c.score * 1000) / 1000, snippet: c.text.slice(0, 180) }))
  });
}