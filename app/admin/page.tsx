"use client";
import { useCallback, useEffect, useState } from "react";

interface Row {
  provider: string; model: string; configured: boolean; status: string;
  priority: number; dailyLimit: number; requestsUsed: number; lastError: string | null; freeTier: boolean;
}

export default function AdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/providers"); const d = await r.json();
    setRows(d.providers || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function update(id: string, body: Record<string, unknown>) {
    const r = await fetch("/api/providers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
    const d = await r.json();
    setMsg(d.error || "Saved ✓"); load();
  }

  async function resetUsage(id: string) { await update(id, { resetUsage: true }); }

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">Admin — AI Provider Management</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500"><th>Provider</th><th>Model</th><th>Status</th><th>Priority</th><th>Free Tier</th><th>Daily Limit</th><th>Used</th><th>Configured</th><th>Actions</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.provider} className="border-t align-middle">
              <td className="py-2 font-medium">{r.provider}</td>
              <td><input defaultValue={r.model} onBlur={(e) => e.target.value.trim() && update(r.provider, { model: e.target.value })} className="input !py-1 text-xs" /></td>
              <td><button onClick={() => update(r.provider, { enabled: r.status !== "Active" })} className={`badge cursor-pointer ${r.status === "Active" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>{r.status}</button></td>
              <td><input type="number" defaultValue={r.priority} onBlur={(e) => update(r.provider, { priority: parseInt(e.target.value) })} className="input !py-1 text-xs w-16" /></td>
              <td>{r.freeTier ? "Free" : "Paid"}</td>
              <td><input type="number" defaultValue={r.dailyLimit} onBlur={(e) => update(r.provider, { dailyLimit: parseInt(e.target.value) })} className="input !py-1 text-xs w-20" /></td>
              <td>{r.requestsUsed}</td>
              <td>{r.configured ? "✓ key set" : "— no key"}</td>
              <td><button onClick={() => resetUsage(r.provider)} className="text-xs underline">Reset</button></td>
            </tr>))}</tbody>
        </table>
        {msg && <p className="mt-2 text-xs text-brand-600">{msg}</p>}
        <p className="mt-2 text-xs text-slate-500">Settings persist to the database and take effect on the next AI request. Keys stay in server environment variables — never exposed here.</p>
      </div>
    </div>
  );
}