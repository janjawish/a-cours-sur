import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Search, Settings, Sparkles } from "lucide-react";
import { CourseWorkspace } from "./components/CourseWorkspace";
import { CoursesView } from "./components/CoursesView";
import { ReviewView } from "./components/ReviewView";
import { SearchView } from "./components/SearchView";
import { SettingsView } from "./components/SettingsView";
import { createCourse, createSubject, loadLibrary } from "./lib/api";
import type { LibraryData, View } from "./types";

const navItems = [
  { id: "courses", label: "Cours", icon: BookOpen },
  { id: "search", label: "Recherche", icon: Search },
  { id: "review", label: "Révisions", icon: Sparkles },
  { id: "settings", label: "Paramètres", icon: Settings },
] as const;

function App() {
  const [view, setView] = useState<View>("courses");
  const [library, setLibrary] = useState<LibraryData>({ semesters: [], subjects: [], courses: [] });
  const [activeCourseId, setActiveCourseId] = useState<number>();
  const [initialTimestamp, setInitialTimestamp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    try {
      setLibrary(await loadLibrary());
      setError(undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => void refresh(), [refresh]);

  const activeCourse = useMemo(
    () => library.courses.find((course) => course.id === activeCourseId),
    [activeCourseId, library.courses],
  );

  const handleCreateCourse = async (subjectId: number, title: string) => {
    const id = await createCourse(subjectId, title);
    await refresh();
    setActiveCourseId(id);
    setInitialTimestamp(0);
  };

  const handleCreateSubject = async (name: string) => {
    const semester = library.semesters[0];
    if (!semester) return;
    await createSubject(semester.id, name);
    await refresh();
  };

  return (
    <div className="h-screen overflow-hidden bg-stone-50 text-stone-900 selection:bg-amber-100">
      <div className="grid h-full grid-cols-[228px_minmax(0,1fr)]">
        <aside className="flex h-full flex-col border-r border-stone-200 bg-[#f4f3ef] px-3 py-4">
          <div className="mb-7 flex items-center gap-2.5 px-2">
            <div className="grid size-8 place-items-center rounded-lg bg-stone-900 text-sm font-semibold text-white">A</div>
            <div>
              <p className="text-[15px] font-semibold tracking-tight">À cours sûr</p>
              <p className="text-[11px] text-stone-500">Bureau d'étude local</p>
            </div>
          </div>

          <nav className="space-y-1" aria-label="Navigation principale">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`nav-item ${view === id && !activeCourseId ? "nav-item-active" : ""}`}
                onClick={() => { setView(id); setActiveCourseId(undefined); }}
              >
                <Icon size={17} strokeWidth={1.8} />
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-7 min-h-0 flex-1 overflow-y-auto px-2">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Matières</p>
            {library.subjects.map((subject) => (
              <button key={subject.id} className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left text-[13px] text-stone-600 hover:text-stone-950" onClick={() => { setView("courses"); setActiveCourseId(undefined); }}>
                <span className="size-2 rounded-full" style={{ backgroundColor: subject.color }} />
                <span className="truncate">{subject.name}</span>
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-stone-200 bg-white/65 p-3 text-xs leading-relaxed text-stone-500">
            <div className="mb-1 flex items-center gap-1.5 font-medium text-stone-700"><span className="size-1.5 rounded-full bg-emerald-600" />Données locales</div>
            Audio, notes et recherche restent sur cet ordinateur.
          </div>
        </aside>

        <main className="min-w-0 overflow-hidden">
          {error && <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-700">{error}</div>}
          {activeCourseId && activeCourse ? (
            <CourseWorkspace courseId={activeCourseId} initialTimestamp={initialTimestamp} onBack={() => { setActiveCourseId(undefined); setInitialTimestamp(0); void refresh(); }} />
          ) : view === "courses" ? (
            <CoursesView library={library} loading={loading} onOpenCourse={(id) => { setInitialTimestamp(0); setActiveCourseId(id); }} onCreateCourse={handleCreateCourse} onCreateSubject={handleCreateSubject} />
          ) : view === "search" ? (
            <SearchView onOpenCourse={(id, timestampMs) => { setInitialTimestamp(timestampMs); setActiveCourseId(id); setView("courses"); }} />
          ) : view === "review" ? (
            <ReviewView courses={library.courses} onOpenCourse={(id) => { setInitialTimestamp(0); setActiveCourseId(id); }} />
          ) : <SettingsView />}
        </main>
      </div>
    </div>
  );
}

export default App;
