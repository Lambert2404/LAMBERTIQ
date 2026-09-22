import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { seed, all, run, randId } from "@/lib/db";

// Question bank (static reference questions). Generation uses /api/quiz/generate.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  seed();
  const p = req.nextUrl.searchParams;
  const q = p.get("q") || "";
  const subject = p.get("subject") || "";
  const difficulty = p.get("difficulty") || "";
  const where = ["1=1", ...(subject ? ["subject=?"] : []), ...(difficulty ? ["difficulty=?"] : []), ...(q ? ["(question LIKE ? OR topic LIKE ?)"] : [])].join(" AND ");
  const args = [...(subject ? [subject] : []), ...(difficulty ? [difficulty] : []), ...(q ? [`%${q}%`, `%${q}%`] : [])];
  const rows = all<any>(`SELECT id,department,subject,topic,difficulty,qtype,question FROM question_bank WHERE ${where} ORDER BY difficulty LIMIT 100`, ...args);
  return NextResponse.json({ questions: rows });
}

// Admin add question
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  seed();
  const b = await req.json();
  if (!b.question) return NextResponse.json({ error: "question required" }, { status: 400 });
  run("INSERT INTO question_bank(id,department,subject,topic,difficulty,qtype,question,options,answer) VALUES(?,?,?,?,?,?,?,?,?)",
    randId(), b.department || "Environmental Engineering", b.subject || "General", b.topic || null, b.difficulty || "Medium",
    b.qtype || "qa", b.question, b.options ? JSON.stringify(b.options) : null, b.answer || null);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { id } = await req.json();
  run("DELETE FROM question_bank WHERE id=?", id);
  return NextResponse.json({ ok: true });
}