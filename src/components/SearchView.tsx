import { useEffect, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { formatTime, searchCourses } from "../lib/api";
import type { SearchResult } from "../types";

export function SearchView({ onOpenCourse }: { onOpenCourse: (id: number, timestampMs: number) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const timeout = window.setTimeout(() => void searchCourses(query.trim()).then(setResults).catch(() => setResults([])), 180);
    return () => window.clearTimeout(timeout);
  }, [query]);
  return <div className="h-full overflow-y-auto"><header className="border-b border-stone-200 px-8 py-6"><h1 className="text-xl font-semibold">Recherche</h1><p className="mt-1 text-sm text-stone-500">Titres, transcriptions, notes et résumés — uniquement sur cet ordinateur.</p></header><div className="mx-auto max-w-4xl px-8 py-8"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={19} /><input autoFocus className="w-full rounded-xl border border-stone-300 bg-white py-3.5 pl-12 pr-4 text-[15px] outline-none transition focus:border-stone-500 focus:ring-4 focus:ring-stone-100" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un concept, une définition, un devoir…" /></div><div className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white">{query.length < 2 ? <div className="px-6 py-16 text-center text-sm text-stone-400">Saisissez au moins deux caractères.</div> : results.length === 0 ? <div className="px-6 py-16 text-center text-sm text-stone-400">Aucun résultat local.</div> : results.map((result, index) => <button key={`${result.courseId}-${result.source}-${index}`} className={`group flex w-full items-start gap-4 px-5 py-4 text-left hover:bg-stone-50 ${index ? "border-t border-stone-100" : ""}`} onClick={() => onOpenCourse(result.courseId, result.timestampMs)}><span className="mt-0.5 w-14 shrink-0 font-mono text-xs text-stone-400">{formatTime(result.timestampMs)}</span><div className="min-w-0 flex-1"><div className="mb-1 flex items-center gap-2"><span className="text-sm font-medium">{result.courseTitle}</span><span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] uppercase text-stone-500">{result.source}</span></div><p className="text-xs text-stone-400">{result.subjectName}</p><p className="mt-2 text-sm leading-6 text-stone-600">{result.excerpt}</p></div><ArrowUpRight size={15} className="mt-1 text-stone-300 group-hover:text-stone-700" /></button>)}</div></div></div>;
}
