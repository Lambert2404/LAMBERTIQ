"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Registration failed."); setLoading(false); return; }
    const s = await signIn("credentials", { redirect: false, email, password });
    if (s?.ok) router.push("/dashboard"); else router.push("/login");
  }

  return (
    <div className="mx-auto max-w-sm grid gap-4">
      <div className="card">
        <h1 className="text-2xl font-extrabold text-brand-700">Join LAMBERTIQ</h1>
        <form onSubmit={submit} className="mt-4 grid gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" className="input" />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="input" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6)" className="input" required />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={loading} className="btn">{loading ? "Creating…" : "Create account"}</button>
        </form>
        <a href="/login" className="mt-2 block text-sm text-brand-600 underline">Already have an account? Sign in</a>
      </div>
    </div>
  );
}