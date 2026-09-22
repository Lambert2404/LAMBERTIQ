import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { seed, run, randId } from "@/lib/db";

export async function POST(req: Request) {
  try {
    seed();
    const { email, password, name } = await req.json();
    const e = (email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    if (!password || password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    const { findUserByEmail } = await import("@/lib/db");
    if (findUserByEmail(e)) return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    run("INSERT INTO users(id,email,name,password_hash,role,plan) VALUES(?,?,?,?,?,?)",
      randId(), e, (name || "").trim() || null, bcrypt.hashSync(password, 10), "student", "free");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}