"use client";
import { useCallback, useEffect, useState } from "react";

interface Doc { id: string; filename: string; parser: string; chars: number; created_at: string }

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [active, setActive] = useState<Doc | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [chunks, setChunks] = useState<{ score: number; snippet: string }[] | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/documents"); const d = await r.json();
    setDocs(d.documents || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); setMsg("");
    const fd = new FormData(); fd.append("file", file);
    try {
      const r = await fetch("/api/documents", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) setMsg(d.error || "Upload failed");
      else { setMsg(`Uploaded "${d.filename}" — ${d.chars} chars in ${d.chunks} chunks (${d.parser})`); await load(); }
    } catch { setMsg("Upload failed"); }
    setUploading(false);
    e.target.value = "";
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault(); if (!active || !question.trim() || busy) return;
    setBusy(true); setAnswer(""); setChunks(null);
    try {
      const r = await fetch("/api/documents/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: active.id, question }) });
      const d = await r.json();
      setAnswer(d.final || d.error);
      setChunks(d.usedChunks || null);
    } catch { setAnswer("Query failed"); }
    setBusy(false);
  }

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">My Documents — Analyzer</h1>
      <div className="card grid gap-3">
        <p className="text-sm text-slate-600">Upload PDF, DOCX, PPTX or TXT lecture notes. Answers will prioritise your material:
          <b>“According to your document”</b> vs <b>“Additional explanation”</b>.</p>
        <label className="btn cursor-pointer gap-2">
          {uploading ? "Uploading…" : "Upload document"}
          <input type="file" accept=".pdf,.docx,.pptx,.txt,.md" className="hidden" onChange={upload} />
        </label>
        {msg && <p className="text-sm text-brand-600">{msg}</p>}
      </div>
      {docs.length > 0 && (
        <div className="card">
          <h2 className="font-bold mb-2">Your documents</h2>
          <div className="flex flex-wrap gap-2">
            {docs.map((d) => (
              <button key={d.id} onClick={() => setActive(d)}
                className={`badge !text-sm cursor-pointer ${active?.id === d.id ? "bg-brand-600 text-white border-brand-600" : ""}`}>
                {d.filename} · {d.parser}
              </button>
            ))}
          </div>
        </div>
      )}
      {active && (
        <div className="card grid gap-3">
          <h2 className="font-bold">Ask about “{active.filename}”</h2>
          <form onSubmit={ask} className="flex gap-2">
            <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. Explain activated sludge according to my notes" className="input" />
            <button className="btn" disabled={busy}>{busy ? "Reading…" : "Ask"}</button>
          </form>
          {answer && (
            <div>
              <div className="badge mb-2">LAMBERTIQ AI — Document Q&amp;A</div>
              <div className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm">{answer}</div>
            </div>
          )}
          {chunks && (
            <details className="text-xs text-slate-500">
              <summary>Retrieved chunks used</summary>
              {chunks.map((c, i) => <div key={i} className="mt-1 rounded bg-slate-50 p-2">score {c.score} — {c.snippet}…</div>)}
            </details>
          )}
        </div>
      )}
    </div>
  );
}