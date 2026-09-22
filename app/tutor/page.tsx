import Chat from "@/components/Chat";

export default async function TutorPage({ searchParams }: { searchParams: { subject?: string } }) {
  const subject = searchParams.subject;
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">AI Tutor — Environmental Engineering + All Subjects</h1>
      {subject && <p className="text-sm text-slate-600">Subject context: <b>{subject}</b></p>}
      <Chat initialMode="ask" initialSubject={subject} />
    </div>
  );
}