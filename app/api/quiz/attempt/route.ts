import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { seed, run, randId, all, scalar } from "@/lib/db";

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  seed();
  const { quizId, answers } = await req.json();
  const quiz = scalar<any>("SELECT id,subject,topic,user_id FROM quizzes WHERE id=?", quizId);
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  const questions = all<any>("SELECT * FROM quiz_questions WHERE quiz_id=? ORDER BY qorder", quizId);
  if (questions.length === 0) return NextResponse.json({ error: "Empty quiz" }, { status: 400 });

  const feedback: { id: string; correct: boolean | null; yourAnswer: string | null; modelAnswer: string; qtype: string }[] = [];
  let correct = 0;
  for (const q of questions) {
    const selected = String(answers?.[q.id] ?? "").trim();
    const model = q.answer || "";
    let isCorrect: boolean | null = null;
    if (q.qtype === "mcq" || q.qtype === "tf") { isCorrect = norm(selected) === norm(model); if (isCorrect) correct++; }
    else { isCorrect = null; } // short answer → self-graded against model answer
    feedback.push({ id: q.id, correct: isCorrect, yourAnswer: selected || null, modelAnswer: model, qtype: q.qtype });
  }
  const score = Math.round((correct / questions.length) * 100);

  run("INSERT INTO quiz_attempts(id,quiz_id,user_id,score) VALUES(?,?,?,?)", randId(), quizId, session.user.id, score);
  const row = scalar<any>("SELECT id FROM study_progress WHERE user_id=? AND subject=? AND topic IS ?", session.user.id, quiz.subject, null);
  if (!row) run("INSERT INTO study_progress(id,user_id,subject,topic,score,study_time_min) VALUES(?,?,?,?,?,?)",
    randId(), session.user.id, quiz.subject || "General", quiz.topic || null, score, 10);
  else run("UPDATE study_progress SET score=?, updated_at=datetime('now') WHERE id=?", score, row.id);

  return NextResponse.json({ score, total: questions.length, correct, feedback });
}