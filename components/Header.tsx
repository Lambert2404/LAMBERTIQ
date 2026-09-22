"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Header() {
  const { data: session } = useSession();
  return (
    <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <a href="/" className="text-xl font-extrabold tracking-tight text-brand-700">LAMBERTIQ</a>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/tutor" className="hover:text-brand-700">AI Tutor</Link>
          <Link href="/dashboard" className="hover:text-brand-700">Dashboard</Link>
          <Link href="/subjects" className="hover:text-brand-700">Subjects</Link>
          <Link href="/documents" className="hover:text-brand-700">Documents</Link>
          <Link href="/quizzes" className="hover:text-brand-700">Quizzes</Link>
          {session?.user?.role === "admin" && <Link href="/admin" className="hover:text-brand-700">Admin</Link>}
          {session?.user ? (
            <button onClick={() => signOut({ callbackUrl: "/" })} className="badge cursor-pointer">
              {session.user.email} · Logout
            </button>
          ) : (
            <Link href="/login" className="btn !py-1.5">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}