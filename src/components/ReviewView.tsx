import { useState } from "react";
import { BookOpenCheck, ChevronRight, LoaderCircle } from "lucide-react";
import { GeminiProvider } from "../lib/ai";
import type { Course } from "../types";
import { PageHeading } from "./Brand";

const geminiProvider = new GeminiProvider();

export function ReviewView({ courses, onOpenCourse }: { courses: Course[]; onOpenCourse: (id: number) => void }) {
  const [running, setRunning] = useState<number>();
  const [message, setMessage] = useState<string>();
  const run = async (courseId: number) => { setRunning(courseId); setMessage(undefined); try { await geminiProvider.analyze(courseId); setMessage("Analyse terminée. La fiche est disponible dans le cours."); } catch (reason) { setMessage(String(reason)); } finally { setRunning(undefined); } };
  return <div className="h-full overflow-y-auto"><header className="border-b border-[var(--line)] px-8 py-6"><PageHeading eyebrow="Mémoriser malin" title="Révisions" description="Transformez un cours terminé en fiches, flashcards et quiz structurés — sans chatbot au centre de l'expérience." icon={BookOpenCheck} /></header><div className="mx-auto max-w-5xl px-8 py-8">{message && <div className="mb-5 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--muted)]">{message}</div>}<div className="panel overflow-hidden">{courses.length === 0 ? <div className="py-20 text-center text-sm text-[var(--muted)]">Terminez un cours pour préparer vos révisions.</div> : courses.map((course, index) => <div key={course.id} className={`course-row flex items-center gap-4 p-5 ${index ? "border-t" : ""}`}><div className="grid size-11 place-items-center rounded-xl border-2 border-[var(--ink)] bg-[var(--lilac)] text-[var(--ink)]"><BookOpenCheck size={19} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{course.title}</p><p className="mt-1 text-xs text-[var(--muted)]">{course.subjectName}{course.summary ? " · Analyse disponible" : " · À analyser"}</p></div><button className="secondary-button" onClick={() => void run(course.id)} disabled={running === course.id}>{running === course.id ? <LoaderCircle className="animate-spin" size={15} /> : null}{course.summary ? "Régénérer" : "Générer"}</button><button className="icon-button" onClick={() => onOpenCourse(course.id)} aria-label="Ouvrir"><ChevronRight size={17} /></button></div>)}</div></div></div>;
}
