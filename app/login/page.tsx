"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    const res = await signIn("credentials", { redirect: false, email, password });
    if (res?.ok) router.push("/dashboard");
    else setError("Invalid email or password.");
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-sm grid gap-4">
      <div className="card">
        <h1 className="text-2xl font-extrabold text-brand-700">Sign in to LAMBERTIQ</h1>
        <p className="text-sm text-slate-500 mt-1">Learn Smarter. Think Better. Achieve More.</p>
        <form onSubmit={submit} className="mt-4 grid gap-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="input" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="input" required />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={loading} className="btn">{loading ? "Signing in…" : "Sign in"}</button>
        </form>
        <p className="mt-3 text-sm text-slate-500">Demo: student@lambertiq.education / student123 · Admin: admin@lambertiq.education / admin123</p>
        <a href="/register" className="mt-2 block text-sm text-brand-600 underline">Create an account</a>
      </div>
    </div>
  );
}