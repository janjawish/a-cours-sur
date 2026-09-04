import { useEffect, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { formatTime, searchCourses } from "../lib/api";
import type { SearchResult } from "../types";
import { PageHeading } from "./Brand";

export function SearchView({ onOpenCourse }: { onOpenCourse: (id: number, timestampMs: number) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const timeout = window.setTimeout(() => void searchCourses(query.trim()).then(setResults).catch(() => setResults([])), 180);
    return () => window.clearTimeout(timeout);
  }, [query]);
  return <div className="h-full overflow-y-auto"><header className="border-b border-[var(--line)] px-8 py-6"><PageHeading eyebrow="Tout retrouver" title="Recherche" description="Titres, transcriptions, notes et résumés — uniquement sur cet ordinateur." icon={Search} /></header><div className="mx-auto max-w-4xl px-8 py-8"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--blue)]" size={19} /><input autoFocus className="search-field w-full rounded-xl py-3.5 pl-12 pr-4 text-[15px] outline-none" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un concept, une définition, un devoir…" /></div><div className="panel mt-8 overflow-hidden">{query.length < 2 ? <div className="px-6 py-16 text-center text-sm text-[var(--muted)]">Saisissez au moins deux caractères.</div> : results.length === 0 ? <div className="px-6 py-16 text-center text-sm text-[var(--muted)]">Aucun résultat local.</div> : results.map((result, index) => <button key={`${result.courseId}-${result.source}-${index}`} className={`course-row group flex w-full items-start gap-4 px-5 py-4 text-left ${index ? "border-t" : ""}`} onClick={() => onOpenCourse(result.courseId, result.timestampMs)}><span className="mt-0.5 w-14 shrink-0 font-mono text-xs font-bold text-[var(--blue)]">{formatTime(result.timestampMs)}</span><div className="min-w-0 flex-1"><div className="mb-1 flex items-center gap-2"><span className="text-sm font-bold">{result.courseTitle}</span><span className="rounded bg-[var(--aqua)] px-1.5 py-0.5 text-[10px] font-bold uppercase">{result.source}</span></div><p className="text-xs text-[var(--muted)]">{result.subjectName}</p><p className="mt-2 text-sm leading-6 text-[#4b475b]">{result.excerpt}</p></div><ArrowUpRight size={15} className="mt-1 text-[var(--muted)] group-hover:text-[var(--blue)]" /></button>)}</div></div></div>;
}
