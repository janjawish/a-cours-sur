import { useState } from "react";
import { BookOpenCheck, ChevronRight, LoaderCircle } from "lucide-react";
import { GeminiProvider } from "../lib/ai";
import type { Course } from "../types";

const geminiProvider = new GeminiProvider();

export function ReviewView({ courses, onOpenCourse }: { courses: Course[]; onOpenCourse: (id: number) => void }) {
  const [running, setRunning] = useState<number>();
  const [message, setMessage] = useState<string>();
  const run = async (courseId: number) => { setRunning(courseId); setMessage(undefined); try { await geminiProvider.analyze(courseId); setMessage("Analyse terminée. La fiche est disponible dans le cours."); } catch (reason) { setMessage(String(reason)); } finally { setRunning(undefined); } };
  return <div className="h-full overflow-y-auto"><header className="border-b border-stone-200 px-8 py-6"><h1 className="text-xl font-semibold">Révisions</h1><p className="mt-1 text-sm text-stone-500">Transformez un cours terminé en supports structurés, sans chatbot.</p></header><div className="mx-auto max-w-5xl px-8 py-8">{message && <div className="mb-5 rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">{message}</div>}<div className="overflow-hidden rounded-xl border border-stone-200 bg-white">{courses.length === 0 ? <div className="py-20 text-center text-sm text-stone-400">Terminez un cours pour préparer vos révisions.</div> : courses.map((course, index) => <div key={course.id} className={`flex items-center gap-4 p-5 ${index ? "border-t border-stone-100" : ""}`}><div className="grid size-10 place-items-center rounded-lg bg-stone-100 text-stone-600"><BookOpenCheck size={18} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{course.title}</p><p className="mt-1 text-xs text-stone-500">{course.subjectName}{course.summary ? " · Analyse disponible" : " · À analyser"}</p></div><button className="secondary-button" onClick={() => void run(course.id)} disabled={running === course.id}>{running === course.id ? <LoaderCircle className="animate-spin" size={15} /> : null}{course.summary ? "Régénérer" : "Générer"}</button><button className="icon-button" onClick={() => onOpenCourse(course.id)} aria-label="Ouvrir"><ChevronRight size={17} /></button></div>)}</div></div></div>;
}
