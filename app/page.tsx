export default function Home() {
  return (
    <div className="grid gap-6">
      <section className="card bg-gradient-to-br from-brand-700 to-brand-950 text-white border-0">
        <h1 className="text-4xl font-extrabold">LAMBERTIQ</h1>
        <p className="mt-1 text-brand-100">Learn Smarter. Think Better. Achieve More.</p>
        <p className="mt-3 max-w-2xl text-sm text-brand-50">
          Multi-AI study platform — Gemini, Groq, OpenRouter, Mistral, Hugging Face & Cloudflare working together.
          Environmental Engineering focus. English + Kiswahili.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/tutor" className="btn bg-white text-brand-700 hover:bg-brand-50">Ask Tutor</a>
          <a href="/subjects" className="rounded-xl border border-white/40 px-4 py-2 text-white">Browse Subjects</a>
          <a href="/dashboard" className="rounded-xl border border-white/40 px-4 py-2 text-white">Dashboard</a>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        {[["Ask Tutor", "Normal AI conversation, multi-model synthesis.", "/tutor"],
          ["Engineering Solver", "Given → Formula → Substitution → Answer + units.", "/tutor"],
          ["Document Q&A", "Upload notes; answers prioritize your material.", "/documents"],
          ["Quiz Mode", "MCQ, True/False, calculations, exam-style.", "/quizzes"],
          ["Environmental Engineering", "Water, wastewater, air, waste, EIA & more.", "/subjects"],
          ["Kiswahili + English", "Explain BOD, COD, EIA in either language.", "/tutor"]].map(([t, d, h]) => (
          <a key={t} href={h} className="card hover:shadow-md"><h3 className="font-bold">{t}</h3><p className="text-sm text-slate-600 mt-1">{d}</p></a>
        ))}
      </div>
    </div>
  );
}
