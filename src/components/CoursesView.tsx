import { useState } from "react";
import { ArrowUpRight, BookOpen, CalendarDays, Clock3, Plus, Zap } from "lucide-react";
import { PageHeading, SectionTitle } from "./Brand";
import { formatTime } from "../lib/api";
import type { LibraryData } from "../types";

interface Props {
  library: LibraryData;
  loading: boolean;
  onOpenCourse: (id: number) => void;
  onCreateCourse: (subjectId: number, title: string) => Promise<void>;
  onCreateSubject: (name: string) => Promise<void>;
}

export function CoursesView({ library, loading, onOpenCourse, onCreateCourse, onCreateSubject }: Props) {
  const [creating, setCreating] = useState(false);
  const [creatingSubject, setCreatingSubject] = useState(false);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState<number>();
  const [newSubject, setNewSubject] = useState("");

  const submitCourse = async (event: React.FormEvent) => {
    event.preventDefault();
    const chosen = subjectId ?? library.subjects[0]?.id;
    if (!chosen || !title.trim()) return;
    await onCreateCourse(chosen, title.trim());
    setTitle("");
    setCreating(false);
  };

  return (
    <div className="h-full overflow-y-auto">
      <header className="sticky top-0 z-10 flex min-h-24 items-center justify-between border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--paper)_94%,transparent)] px-8 py-5 backdrop-blur">
        <PageHeading eyebrow={library.semesters[0]?.name ?? "Bibliothèque"} title="Mes cours" />
        <div className="flex gap-2"><button className="secondary-button" onClick={() => setCreatingSubject(true)}><Plus size={15} /> Matière</button><button className="primary-button" onClick={() => setCreating(true)} disabled={library.subjects.length === 0}><Plus size={16} /> Nouveau cours</button></div>
      </header>

      <div className="mx-auto max-w-6xl px-8 py-8">
        <section className="hero-pop mb-10 grid grid-cols-[1.5fr_1fr] gap-6 rounded-2xl p-7">
          <div className="hero-copy"><p className="mb-3 text-xs font-black uppercase tracking-[.12em]">Prêt pour le prochain cours</p><h2 className="hero-title max-w-lg">Capte le cours.<br />Garde l'essentiel.</h2><p className="mt-4 max-w-xl text-sm font-medium leading-6 text-[var(--ink)]/70">Audio, transcription et notes restent sauvegardés sur cet ordinateur — même si Whisper ou l'analyse s'arrêtent.</p></div>
          <div className="hero-copy flex items-end justify-end"><div className="stat-block grid grid-cols-2 gap-x-8 gap-y-4 pl-8 text-sm"><div><p className="text-3xl font-black">{library.courses.length}</p><p className="font-medium opacity-65">cours</p></div><div><p className="text-3xl font-black">{library.subjects.length}</p><p className="font-medium opacity-65">matières</p></div><div className="col-span-2 flex items-center gap-2 text-xs font-bold"><Zap size={14} fill="currentColor" /> Stockage local actif</div></div></div>
        </section>

        <SectionTitle label="Cours récents" detail={`${library.courses.length} au total`} />
        {loading ? <div className="py-20 text-center text-sm text-stone-400">Chargement…</div> : library.courses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 px-8 py-16 text-center">
            <BookOpen className="mx-auto mb-4 text-stone-400" size={28} strokeWidth={1.5} /><h3 className="font-medium">Votre premier cours commence ici</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stone-500">Créez une matière dans la base locale, puis lancez votre premier enregistrement.</p>
            <form className="mx-auto mt-5 flex max-w-md gap-2" onSubmit={async (event) => { event.preventDefault(); if (newSubject.trim()) { await onCreateSubject(newSubject.trim()); setNewSubject(""); } }}><input className="field" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Ex. Mathématiques" /><button className="secondary-button" type="submit">Ajouter</button></form>
          </div>
        ) : (
          <div className="panel overflow-hidden">
            {library.courses.map((course, index) => (
              <button key={course.id} className={`course-row group grid w-full grid-cols-[1fr_190px_110px_24px] items-center gap-4 px-5 py-4 text-left ${index > 0 ? "border-t" : ""}`} onClick={() => onOpenCourse(course.id)}>
                <div className="min-w-0"><div className="mb-1 flex items-center gap-2"><span className="truncate text-sm font-bold">{course.title}</span>{course.status === "recording" && <span className="rounded bg-[var(--pink)] px-1.5 py-0.5 text-[10px] font-bold text-white">EN COURS</span>}</div><p className="truncate text-xs text-[var(--muted)]">{course.subjectName}</p></div>
                <span className="flex items-center gap-2 text-xs text-stone-500"><CalendarDays size={14} />{new Date(course.startedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
                <span className="flex items-center gap-2 text-xs text-stone-500"><Clock3 size={14} />{course.durationMs ? formatTime(course.durationMs) : "Brouillon"}</span><ArrowUpRight size={15} className="text-stone-300 transition group-hover:text-stone-700" />
              </button>
            ))}
          </div>
        )}
      </div>

      {creating && <div className="fixed inset-0 z-30 grid place-items-center bg-[var(--ink)]/35 p-6" onMouseDown={() => setCreating(false)}><form className="modal-card" onSubmit={submitCourse} onMouseDown={(e) => e.stopPropagation()}><p className="eyebrow">Nouvelle session</p><h2 className="display-title !text-[27px]">Nouveau cours</h2><p className="mb-5 mt-2 text-sm text-[var(--muted)]">Vous pourrez lancer l'enregistrement depuis l'espace du cours.</p><label className="label">Matière</label><select className="field mb-4" value={subjectId ?? library.subjects[0]?.id} onChange={(e) => setSubjectId(Number(e.target.value))}>{library.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select><label className="label">Titre du cours</label><input autoFocus className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Introduction aux suites" /><div className="mt-6 flex justify-end gap-2"><button type="button" className="secondary-button" onClick={() => setCreating(false)}>Annuler</button><button className="primary-button" type="submit">Créer</button></div></form></div>}
      {creatingSubject && <div className="fixed inset-0 z-30 grid place-items-center bg-[var(--ink)]/35 p-6" onMouseDown={() => setCreatingSubject(false)}><form className="modal-card" onSubmit={async (event) => { event.preventDefault(); if (!newSubject.trim()) return; await onCreateSubject(newSubject.trim()); setNewSubject(""); setCreatingSubject(false); }} onMouseDown={(event) => event.stopPropagation()}><p className="eyebrow">Organisation</p><h2 className="display-title !text-[27px]">Nouvelle matière</h2><p className="mb-5 mt-2 text-sm text-[var(--muted)]">Elle sera ajoutée au semestre actif.</p><label className="label">Nom</label><input autoFocus className="field" value={newSubject} onChange={(event) => setNewSubject(event.target.value)} placeholder="Ex. Histoire contemporaine" /><div className="mt-6 flex justify-end gap-2"><button type="button" className="secondary-button" onClick={() => setCreatingSubject(false)}>Annuler</button><button className="primary-button" type="submit">Ajouter</button></div></form></div>}
    </div>
  );
}
