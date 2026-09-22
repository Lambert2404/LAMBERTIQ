import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { findUserByEmail, seed } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        seed();
        if (!credentials?.email || !credentials?.password) return null;
        const user = findUserByEmail(credentials.email.trim().toLowerCase());
        if (!user) return null;
        const ok = bcrypt.compareSync(credentials.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan };
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) { token.id = (user as any).id; token.role = (user as any).role; token.plan = (user as any).plan; }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id || "";
        session.user.role = token.role || "student";
        session.user.plan = token.plan || "free";
      }
      return session;
    }
  }
};