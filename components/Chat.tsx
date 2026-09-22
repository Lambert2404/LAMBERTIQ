"use client";
import { useState } from "react";

interface Msg { role: "user" | "assistant"; content: string }
interface Resp { provider: string; model: string; answer: string; status: string; responseTimeMs: number }

export default function Chat({ initialMode = "ask", initialSubject }: { initialMode?: string; initialSubject?: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState(initialMode);
  const [lang, setLang] = useState("en");
  const [subject, setSubject] = useState(initialSubject || "");
  const [loading, setLoading] = useState(false);
  const [last, setLast] = useState<{ modelsConsulted: any[]; responses: Resp[]; uncertainties: string[] } | null>(null);
  const [showModels, setShowModels] = useState(false);

  async function send() {
    if (!input.trim() || loading) return;
    const next = [...messages, { role: "user" as const, content: input }];
    setMessages(next); setInput(""); setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })), mode, language: lang, subject: subject || undefined })
      });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.final || data.error || "No response." }]);
      setLast({ modelsConsulted: data.synthesis?.modelsConsulted || data.modelsConsulted || [], responses: data.responses || [], uncertainties: data.synthesis?.uncertainties || [] });
    } catch { setMessages([...next, { role: "assistant", content: "Network error. Please try again." }]); }
    finally { setLoading(false); }
  }

  const modes = ["ask", "teach", "explain-simply", "exam", "quiz", "calculation", "revision", "document-qa", "research"];

  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
      <div className="card h-fit">
        <label className="text-xs font-semibold">STUDY MODE</label>
        <div className="mt-2 grid gap-1">
          {modes.map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded-lg px-3 py-1.5 text-left text-sm ${mode === m ? "bg-brand-600 text-white" : "hover:bg-slate-100"}`}>{m}</button>
          ))}
        </div>
        <label className="mt-4 text-xs font-semibold">LANGUAGE</label>
        <select value={lang} onChange={(e) => setLang(e.target.value)} className="input mt-2">
          <option value="en">English</option>
          <option value="sw">Kiswahili</option>
        </select>
        <label className="mt-4 text-xs font-semibold">TOPIC (context)</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Wastewater Engineering" className="input mt-2" />
      </div>
      <div className="card">
        <div className="mb-4 space-y-3">
          {messages.length === 0 && <p className="text-slate-500 text-sm">Karibu LAMBERTIQ! Ask e.g. “Explain BOD and COD” or “Calculate hydraulic retention time”.</p>}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "ml-auto max-w-[85%] rounded-xl bg-brand-600 px-3 py-2 text-white" : "max-w-[95%] rounded-xl bg-slate-100 px-3 py-2"}>
              {m.role === "assistant" && <div className="badge mb-1">LAMBERTIQ AI</div>}
              <div className="whitespace-pre-wrap text-sm">{m.content}</div>
            </div>
          ))}
          {loading && <p className="text-sm text-slate-500">Consulting AI models…</p>}
        </div>
        {last && (
          <div className="mb-3 rounded-xl border p-3 text-xs">
            <div className="font-semibold">AI Models Consulted: {last.modelsConsulted.map((m: any) => `${m.provider} (${m.status})`).join(" · ") || "—"}</div>
            {last.uncertainties?.map((u, i) => <div key={i} className="text-amber-700">⚠ {u}</div>)}
            <button onClick={() => setShowModels(!showModels)} className="mt-1 underline">{showModels ? "Hide" : "View Model Responses"}</button>
            {showModels && last.responses.map((r, i) => (
              <div key={i} className="mt-2 rounded bg-slate-50 p-2"><b>{r.provider} · {r.model}</b> ({r.responseTimeMs}ms)<br />{r.answer.slice(0, 800)}</div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={lang === "sw" ? "Uliza chochote…" : "Ask anything…"} className="input" />
          <button onClick={send} disabled={loading} className="btn">Send</button>
        </div>
      </div>
    </div>
  );
}
