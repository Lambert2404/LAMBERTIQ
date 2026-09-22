import { NextRequest, NextResponse } from "next/server";
import { recommendFor } from "@/data/curriculum";

// POST /api/quiz { subject, topic, count, difficulty, language } — generation prompt; LLM call via /api/chat in client.
export async function POST(req: NextRequest) {
  const { subject = "Wastewater Engineering", topic = "Activated Sludge", count = 5, difficulty = "Medium", language = "en" } = await req.json().catch(() => ({}));
  const prompt = `Generate ${count} ${difficulty} quiz questions (${language}) for ${subject} / ${topic}. Mix MCQ, True/False, short answer, calculation. Return JSON array with {type, question, options, answer}.`;
  return NextResponse.json({ prompt, recommendations: recommendFor(subject) });
}
