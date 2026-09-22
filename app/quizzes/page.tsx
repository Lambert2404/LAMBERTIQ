"use client";
import { useState } from "react";

interface Q {
  id: string; qtype: string; question: string; options: string[] | null;
}
interface Feedback { id: string; correct: boolean | null; yourAnswer: string | null; modelAnswer: string; qtype: string }

export default function QuizzesPage() {
  const [subject, setSubject] = useState("Environmental Engineering");
  const [topic, setTopic] = useState("Activated Sludge");
  const [difficulty, setDifficulty] = useState("Any");
  const [count, setCount] = useState(5);
  const [language, setLanguage] = useState("en");
  const [quizId, setQuizId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; total: number; correct: number; feedback: Feedback[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [bank, setBank] = useState<Q[] & { question?: string }[] | null>(null);
  const [bankQuery, setBankQuery] = useState("");

  async function generate(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setResult(null); setAnswers({}); setQuizId(null);
    try {
      const r = await fetch("/api/quiz/generate", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, topic: topic || undefined, count, difficulty, language }) });
      const d = await r.json();
      setQuizId(d.quizId); setQuestions(d.questions || []);
      if (d.error) alert(d.error);
    } catch { alert("Generation failed"); }
    setBusy(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!quizId) return; setBusy(true);
    const r = await fetch("/api/quiz/attempt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quizId, answers }) });
    setResult(await r.json()); setBusy(false);
  }

  async function browse(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const r = await fetch(`/api/question-bank?subject=${encodeURIComponent(subject)}&difficulty=${encodeURIComponent(difficulty)}&q=${encodeURIComponent(bankQuery)}`);
    const d = await r.json(); setBank(d.questions || []); setBusy(false);
  }

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">Quizzes & Question Bank</h1>
      <form onSubmit={generate} className="card grid gap-3 md:grid-cols-6">
        <input value={subject} onChange={(e) => setSubject(e.target.value)} className="input" placeholder="Subject" />
        <input value={topic} onChange={(e) => setTopic(e.target.value)} className="input" placeholder="Topic" />
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="input"><option>Any</option><option>Easy</option><option>Medium</option><option>Hard</option><option>University Level</option></select>
        <input type="number" min={1} max={12} value={count} onChange={(e) => setCount(Number(e.target.value))} className="input" />
        <select value={language} onChange={(e) => setLanguage(e.target.value)} className="input"><option value="en">English</option><option value="sw">Kiswahili</option></select>
        <button className="btn" disabled={busy}>{busy ? "Working…" : "Take Quiz"}</button>
      </form>

      {quizId && !result && questions.length > 0 && (
        <form onSubmit={submit} className="card grid gap-3">
          <h2 className="font-bold">Answer the questions</h2>
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-xl border p-3">
              <p className="font-medium">{i + 1}. {q.question} <span className="badge ml-1">{q.qtype.toUpperCase()}</span></p>
              {q.options ? (
                <div className="mt-2 grid gap-1">
                  {q.options.map((o) => (
                    <label key={o} className="flex items-center gap-2 text-sm">
                      <input type="radio" name={q.id} value={o} onChange={() => setAnswers((a) => ({ ...a, [q.id]: o }))} />
                      {o}
                    </label>
                  ))}
                </div>
              ) : q.qtype === "tf" ? (
                <div className="mt-2 flex gap-4 text-sm">
                  {["True", "False"].map((o) => (
                    <label key={o} className="flex items-center gap-2">
                      <input type="radio" name={q.id} value={o} onChange={() => setAnswers((a) => ({ ...a, [q.id]: o }))} />
                      {o}
                    </label>
                  ))}
                </div>
              ) : (
                <textarea rows={2} className="input mt-2" placeholder="Your answer…" onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
              )}
            </div>
          ))}
          <button className="btn" disabled={busy}>Submit answers</button>
        </form>
      )}

      {result && (
        <div className="card">
          <h2 className="text-xl font-bold">{result.correct}/{result.total} correct — Score {result.score}%</h2>
          <div className="mt-3 grid gap-2 text-sm">
            {result.feedback.map((f) => (
              <div key={f.id} className="rounded-lg border p-2">
                {f.correct === true && <span className="text-green-700 font-semibold">✓ Correct</span>}
                {f.correct === false && <span className="text-red-700 font-semibold">✗ Incorrect — you answered “{f.yourAnswer}”</span>}
                {f.correct === null && <span className="text-amber-700 font-semibold">Self-grade: compare with the model answer</span>}
                <div className="text-slate-600">Model answer: {f.modelAnswer}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={browse} className="card grid gap-3 md:grid-cols-4">
        <h2 className="font-bold md:col-span-4">Question Bank browser</h2>
        <input value={bankQuery} onChange={(e) => setBankQuery(e.target.value)} className="input" placeholder="Search keyword…" />
        <span className="text-sm text-slate-500 md:col-span-2 self-center">Subject & difficulty from the form above.</span>
        <button className="btn" disabled={busy}>Search bank</button>
        {bank && (
          <div className="md:col-span-4 grid gap-2">
            {bank.map((q) => <div key={q.id} className="rounded-lg border p-2 text-sm">{q.question}</div>)}
            {bank.length === 0 && <p className="text-sm text-slate-500">No entries match.</p>}
          </div>
        )}
      </form>
    </div>
  );
}