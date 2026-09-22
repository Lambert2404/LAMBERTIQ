import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { chatStats, seed, all } from "@/lib/db";
import { recommendFor } from "@/data/curriculum";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const uid = session?.user?.id || "";
  seed();
  const stats = chatStats(uid);
  const topics = all<any>("SELECT subject,MAX(score) score,COUNT(*) attempts,MAX(updated_at) last FROM study_progress WHERE user_id=? GROUP BY subject ORDER BY score ASC", uid);
  const docs = all<any>("SELECT id,filename,created_at FROM documents WHERE user_id=? ORDER BY created_at DESC LIMIT 5", uid);
  const attempts = all<any>("SELECT score,created_at FROM quiz_attempts WHERE user_id=? ORDER BY created_at DESC LIMIT 5", uid);
  const weak = topics.filter((t) => t.score !== null && t.score < 60).map((t) => t.subject);

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">Study Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {[["Questions asked", String(stats.questions)], ["Study time", `${stats.studyTime} min`],
          ["Avg quiz score", stats.avgScore == null ? "—" : `${stats.avgScore}%`], ["Study streak", `${stats.streak} days`],
          ["Topics studied", String(topics.length)], ["Weak topics", weak.length ? weak.join(", ") : "None detected"]].map(([k, v]) => (
          <div key={k} className="card"><div className="text-xs text-slate-500">{k}</div><div className="text-xl font-bold">{v}</div></div>
        ))}
      </div>
      {weak.length > 0 && (
        <div className="card">
          <h2 className="font-bold">Recommended next topics</h2>
          {weak.slice(0, 2).map((t) => (
            <div key={t} className="mt-2 text-sm"><b>{t}</b> → {recommendFor(t).join(" · ")}</div>
          ))}
        </div>
      )}
      {docs.length > 0 && (
        <div className="card">
          <h2 className="font-bold">Recent documents</h2>
          {docs.map((d) => <div key={d.id} className="text-sm text-slate-600 mt-1">📄 {d.filename} — {d.created_at.slice(0, 10)}</div>)}
        </div>
      )}
      {attempts.length > 0 && (
        <div className="card">
          <h2 className="font-bold">Recent quiz attempts</h2>
          {attempts.map((a, i) => <div key={i} className="text-sm text-slate-600 mt-1">{a.created_at.slice(0, 16)} — score {a.score}%</div>)}
        </div>
      )}
    </div>
  );
}