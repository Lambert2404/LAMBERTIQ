import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { extractText, chunkText } from "@/lib/parsers";
import { run, randId, seed, all, getDb } from "@/lib/db";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  seed();
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });
  if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: "Max 15 MB" }, { status: 413 });
  const buffer = Buffer.from(await file.arrayBuffer());
  const { parser, text } = await extractText(file.name, buffer);
  if (text.trim().length < 50) return NextResponse.json({ error: "Could not extract readable text from this file." }, { status: 422 });

  const docId = randId();
  run("INSERT INTO documents(id,user_id,filename,parser,text) VALUES(?,?,?,?,?)", docId, session.user.id, file.name, parser, text);
  const chunks = chunkText(text);
  const ins = getDb().prepare("INSERT INTO document_chunks(id,document_id,chunk_index,text) VALUES(?,?,?,?)");
  let i = 0;
  for (const c of chunks) { ins.run(randId(), docId, i++, c); }

  return NextResponse.json({ id: docId, filename: file.name, parser, chars: text.length, chunks: chunks.length, preview: text.slice(0, 500) });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const docs = all<{ id: string; filename: string; parser: string; chars: number; created_at: string }>(
    "SELECT id,filename,parser,length(text) chars,created_at FROM documents WHERE user_id=? ORDER BY created_at DESC", session.user.id);
  return NextResponse.json({ documents: docs });
}