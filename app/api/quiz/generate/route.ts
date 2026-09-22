import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { seed, run, randId, all, getDb } from "@/lib/db";

// Generate a quiz from the question bank (offline fallback) or via AI when keys are available.
// Deterministic selection: filtered by subject/topic/difficulty, then sampled up to count.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  seed();
  const { subject, topic, count = 5, difficulty = "Medium", language = "en" } = await req.json();

  const where = ["1=1"];
  const args: string[] = [];
  if (subject && subject !== "Any") { where.push("subject=?"); args.push(subject); }
  if (topic && topic !== "Any") { where.push("topic=?"); args.push(topic); }
  if (difficulty && difficulty !== "Any") { where.push("difficulty=?"); args.push(difficulty); }
  const pool = all<any>(`SELECT * FROM question_bank WHERE ${where.join(" AND ")}`, ...args);
  const chosen = pool.sort(() => 0.5 - Math.random()).slice(0, Math.min(count, 12));

  const quizId = randId();
  run("INSERT INTO quizzes(id,user_id,subject,topic,difficulty,language) VALUES(?,?,?,?,?,?)",
    quizId, session.user.id, subject || "General", topic || null, difficulty || "Medium", language || "en");

  const ins = getDb().prepare("INSERT INTO quiz_questions(id,quiz_id,qtype,question,options,answer,qorder) VALUES(?,?,?,?,?,?,?)");
  let order = 0;
  for (const q of chosen) {
    ins.run(randId(), quizId, q.qtype, q.question, q.options, q.answer, order++);
  }

  // prep questions for the client (no answers revealed)
  const questions = all<any>(
    "SELECT id,quiz_id as quizId,qtype,question,options FROM quiz_questions WHERE quiz_id=? ORDER BY qorder", quizId
  ).map((q) => ({ ...q, options: q.options ? JSON.parse(q.options) : null }));

  return NextResponse.json({ quizId, subject, topic, difficulty, count: questions.length, questions });
}