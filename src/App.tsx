import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Search, Settings, Sparkles } from "lucide-react";
import { CourseWorkspace } from "./components/CourseWorkspace";
import { CoursesView } from "./components/CoursesView";
import { ReviewView } from "./components/ReviewView";
import { SearchView } from "./components/SearchView";
import { SettingsView } from "./components/SettingsView";
import { BrandMark } from "./components/Brand";
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
    <div className="h-screen overflow-hidden bg-[var(--paper)] text-[var(--ink)] selection:bg-[var(--yellow)]">
      <div className="grid h-full grid-cols-[236px_minmax(0,1fr)]">
        <aside className="brand-sidebar flex h-full flex-col px-3 py-5">
          <div className="mb-8 px-2">
            <BrandMark />
            <p className="mt-4 text-[11px] font-medium text-white/60">Ton bureau d'étude local.</p>
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
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/45">Matières</p>
            {library.subjects.map((subject) => (
              <button key={subject.id} className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left text-[13px] text-white/70 transition hover:text-white" onClick={() => { setView("courses"); setActiveCourseId(undefined); }}>
                <span className="sidebar-dot size-2 rounded-full" />
                <span className="truncate">{subject.name}</span>
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 p-3 text-xs leading-relaxed text-white/60">
            <div className="mb-1 flex items-center gap-1.5 font-bold text-white"><span className="size-1.5 rounded-full bg-[var(--yellow)]" />100 % local</div>
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
