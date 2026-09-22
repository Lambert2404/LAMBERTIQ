import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "LAMBERTIQ — Learn Smarter. Think Better. Achieve More.",
  description: "Multi-AI study platform with Environmental Engineering focus. English + Kiswahili."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Header />
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
          <footer className="mx-auto max-w-6xl px-4 py-10 text-xs text-slate-500">
            LAMBERTIQ — Learn Smarter. Think Better. Achieve More. · English / Kiswahili · Verify engineering answers with textbooks & lecturers.
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}