import { DEPARTMENTS, ENV_ENGINEERING_SUBJECTS } from "@/data/curriculum";
export default function SubjectsPage() {
  return (<div className="grid gap-4">
    <h1 className="text-2xl font-bold">Subjects</h1>
    <div className="card"><h2 className="font-bold mb-2">Departments</h2>
      <div className="flex flex-wrap gap-2">{DEPARTMENTS.map((d) => <span key={d} className="badge">{d}</span>)}</div></div>
    <h2 className="text-xl font-bold">Environmental Engineering Department</h2>
    {ENV_ENGINEERING_SUBJECTS.map((g) => (
      <div key={g.group} className="card"><h3 className="font-bold">{g.group}</h3>
        <div className="mt-2 flex flex-wrap gap-2">{g.subjects.map((s) => <a key={s} href={`/tutor?subject=${encodeURIComponent(s)}`} className="badge hover:bg-brand-100">{s}</a>)}</div></div>
    ))}
  </div>);
}
