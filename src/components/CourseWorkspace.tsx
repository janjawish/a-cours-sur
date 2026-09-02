import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { ArrowLeft, Bookmark, CircleAlert, Flag, Pause, Play, Square, Tag } from "lucide-react";
import { useRecorder } from "../hooks/useRecorder";
import { addMarker, formatTime, loadCourse, replaceTranscript, saveNote, transcribeCourse } from "../lib/api";
import type { CourseDetail, MarkerKind, WhisperProfile } from "../types";

const markerMeta: Record<MarkerKind, { label: string; shortcut: string; color: string; icon: typeof Tag }> = {
  important: { label: "Important", shortcut: "Ctrl+1", color: "bg-amber-50 text-amber-800 border-amber-200", icon: Flag },
  unclear: { label: "Je n'ai pas compris", shortcut: "Ctrl+2", color: "bg-rose-50 text-rose-800 border-rose-200", icon: CircleAlert },
  review: { label: "À revoir", shortcut: "Ctrl+3", color: "bg-sky-50 text-sky-800 border-sky-200", icon: Bookmark },
  exam: { label: "Examen", shortcut: "Ctrl+4", color: "bg-violet-50 text-violet-800 border-violet-200", icon: Tag },
};

type Tab = "course" | "transcript" | "notes" | "review" | "documents";

export function CourseWorkspace({ courseId, initialTimestamp, onBack }: { courseId: number; initialTimestamp: number; onBack: () => void }) {
  const [detail, setDetail] = useState<CourseDetail>();
  const [tab, setTab] = useState<Tab>("course");
  const [note, setNote] = useState("");
  const [profile] = useState<WhisperProfile>(() => {
    const saved = localStorage.getItem("whisper-profile");
    return saved === "balanced" || saved === "accurate" ? saved : "fast";
  });
  const [transcribing, setTranscribing] = useState(false);
  const [message, setMessage] = useState<string>();
  const audioRef = useRef<HTMLAudioElement>(null);
  const livePass = useRef(false);
  const recorder = useRecorder(courseId);

  const refresh = useCallback(async () => {
    const next = await loadCourse(courseId);
    setDetail(next);
    setNote(next.notes[next.notes.length - 1]?.body ?? "");
  }, [courseId]);

  useEffect(() => void refresh(), [refresh]);

  useEffect(() => {
    if (!detail || note === (detail.notes[detail.notes.length - 1]?.body ?? "")) return;
    const timeout = window.setTimeout(() => {
      void saveNote(courseId, note, recorder.elapsedMs || detail.course.durationMs).catch((reason) => setMessage(String(reason)));
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [courseId, detail, note, recorder.elapsedMs]);

  const currentTime = useCallback(() => recorder.recording ? recorder.elapsedMs : (audioRef.current?.currentTime ?? 0) * 1000, [recorder.elapsedMs, recorder.recording]);

  const mark = useCallback(async (kind: MarkerKind) => {
    if (!detail) return;
    try {
      const marker = await addMarker(courseId, kind, currentTime());
      setDetail({ ...detail, markers: [...detail.markers, marker] });
    } catch (reason) {
      setMessage(String(reason));
    }
  }, [courseId, currentTime, detail]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!event.ctrlKey || !["1", "2", "3", "4"].includes(event.key)) return;
      event.preventDefault();
      const kinds: MarkerKind[] = ["important", "unclear", "review", "exam"];
      void mark(kinds[Number(event.key) - 1]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mark]);

  useEffect(() => {
    if (!recorder.recording) return;
    const runLivePass = async () => {
      if (livePass.current) return;
      livePass.current = true;
      try {
        const segments = await transcribeCourse(courseId, "fast");
        await replaceTranscript(courseId, segments);
        setDetail((current) => current ? { ...current, transcript: segments } : current);
      } catch {
        // L'enregistrement reste prioritaire : une passe Whisper manquée est retentée plus tard.
      } finally {
        livePass.current = false;
      }
    };
    const first = window.setTimeout(() => void runLivePass(), 15_000);
    const interval = window.setInterval(() => void runLivePass(), 25_000);
    return () => { window.clearTimeout(first); window.clearInterval(interval); };
  }, [courseId, recorder.recording]);

  const stopAndTranscribe = async () => {
    await recorder.stop();
    setTranscribing(true);
    setMessage("Transcription locale en cours…");
    try {
      const segments = await transcribeCourse(courseId, profile);
      await replaceTranscript(courseId, segments);
      setMessage("Transcription terminée");
      await refresh();
    } catch (reason) {
      setMessage(`Audio sauvegardé. Transcription indisponible : ${String(reason)}`);
      await refresh();
    } finally {
      setTranscribing(false);
    }
  };

  const audioUrl = useMemo(() => {
    if (!detail?.course.audioPath) return undefined;
    return "__TAURI_INTERNALS__" in window ? convertFileSrc(detail.course.audioPath) : undefined;
  }, [detail?.course.audioPath]);

  useEffect(() => {
    if (!audioUrl || !audioRef.current || initialTimestamp <= 0) return;
    audioRef.current.currentTime = initialTimestamp / 1000;
  }, [audioUrl, initialTimestamp]);

  if (!detail) return <div className="grid h-full place-items-center text-sm text-stone-400">Ouverture du cours…</div>;

  const elapsed = recorder.recording ? recorder.elapsedMs : detail.course.durationMs;
  return (
    <div className="flex h-full flex-col bg-white">
      <header className="border-b border-stone-200 bg-stone-50/90 px-6 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button className="icon-button" onClick={onBack} aria-label="Retour"><ArrowLeft size={17} /></button>
            <div className="min-w-0"><p className="text-[11px] font-medium text-stone-400">{detail.course.subjectName}</p><h1 className="truncate text-[15px] font-semibold">{detail.course.title}</h1></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 font-mono text-sm tabular-nums"><span className={`size-2 rounded-full ${recorder.recording ? "animate-pulse bg-red-500" : "bg-stone-300"}`} />{formatTime(elapsed)}</div>
            {!recorder.recording ? <button className="record-button" onClick={() => void recorder.start()}><span className="size-2 rounded-full bg-white" /> Enregistrer</button> : <button className="stop-button" onClick={() => void stopAndTranscribe()}><Square size={13} fill="currentColor" /> Terminer</button>}
          </div>
        </div>
        <nav className="mt-3 flex gap-5" aria-label="Sections du cours">
          {(["course", "transcript", "notes", "review", "documents"] as Tab[]).map((item) => <button key={item} onClick={() => setTab(item)} className={`tab ${tab === item ? "tab-active" : ""}`}>{{ course: "Cours", transcript: "Transcript", notes: "Notes", review: "Révision", documents: "Documents" }[item]}</button>)}
        </nav>
      </header>

      {(message || recorder.error) && <div className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-xs text-amber-800">{recorder.error ?? message}</div>}

      {tab === "course" && (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <section className="min-h-0 overflow-y-auto border-r border-stone-200 px-7 py-6">
            <div className="mb-5 flex items-center justify-between"><div><h2 className="text-sm font-semibold">Transcript</h2><p className="mt-0.5 text-xs text-stone-400">Synchronisé avec l'audio</p></div>{transcribing && <span className="text-xs text-stone-500">Whisper travaille…</span>}</div>
            {detail.transcript.length === 0 ? <div className="rounded-lg border border-dashed border-stone-200 py-16 text-center text-sm text-stone-400">Le transcript apparaîtra ici au fil du cours.</div> : <div className="space-y-1">{detail.transcript.map((segment) => <button key={segment.id} className="transcript-line" onClick={() => { if (audioRef.current) audioRef.current.currentTime = segment.startMs / 1000; }}><span>{formatTime(segment.startMs)}</span><p>{segment.text}</p></button>)}</div>}
          </section>
          <section className="flex min-h-0 flex-col bg-[#fcfbf8] px-7 py-6">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-semibold">Mes notes</h2><p className="mt-0.5 text-xs text-stone-400">Enregistrement automatique</p></div><span className="text-[11px] text-stone-400">{note.length} caractères</span></div>
            <textarea className="min-h-0 flex-1 resize-none bg-transparent text-[15px] leading-7 outline-none placeholder:text-stone-300" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notez ici les explications, exemples et questions importantes…" />
            <div className="mt-4 border-t border-stone-200 pt-4"><p className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Ajouter un marqueur</p><div className="grid grid-cols-2 gap-2">{(Object.keys(markerMeta) as MarkerKind[]).map((kind) => { const meta = markerMeta[kind]; const Icon = meta.icon; return <button key={kind} className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs ${meta.color}`} onClick={() => void mark(kind)}><Icon size={14} /><span className="flex-1">{meta.label}</span><kbd className="opacity-50">{meta.shortcut.replace("Ctrl+", "^")}</kbd></button>; })}</div></div>
          </section>
        </div>
      )}

      {tab === "transcript" && <section className="mx-auto h-full w-full max-w-4xl overflow-y-auto px-10 py-8"><h2 className="mb-6 text-xl font-semibold">Transcript complet</h2>{detail.transcript.map((segment) => <button key={segment.id} className="transcript-line" onClick={() => { if (audioRef.current) audioRef.current.currentTime = segment.startMs / 1000; }}><span>{formatTime(segment.startMs)}</span><p>{segment.text}</p></button>)}</section>}
      {tab === "notes" && <section className="mx-auto h-full w-full max-w-4xl px-10 py-8"><h2 className="mb-5 text-xl font-semibold">Notes personnelles</h2><textarea className="h-[calc(100%-60px)] w-full resize-none rounded-xl border border-stone-200 bg-[#fffefa] p-6 text-[15px] leading-7 outline-none focus:border-stone-400" value={note} onChange={(e) => setNote(e.target.value)} /></section>}
      {tab === "review" && <ReviewPanel detail={detail} />}
      {tab === "documents" && <section className="grid h-full place-items-center"><div className="text-center"><h2 className="font-semibold">Documents associés</h2><p className="mt-2 max-w-sm text-sm leading-6 text-stone-500">L'import PDF, PPTX, audio et vidéo utilisera le même pipeline local. Le schéma de stockage est déjà prêt.</p><button className="secondary-button mt-5" disabled>Importer bientôt</button></div></section>}

      <footer className="flex h-16 shrink-0 items-center gap-4 border-t border-stone-200 bg-white px-6">
        <button className="icon-button" disabled={!audioUrl} onClick={() => void audioRef.current?.play()}>{audioRef.current?.paused === false ? <Pause size={16} /> : <Play size={16} />}</button>
        <audio ref={audioRef} src={audioUrl} controls className="h-9 flex-1" />
        <div className="flex items-center gap-1">{[...Array(18)].map((_, index) => <span key={index} className="w-0.5 rounded-full bg-stone-300 transition-all" style={{ height: `${6 + ((index * 7) % 15) * (recorder.recording ? Math.max(.3, recorder.level) : .55)}px` }} />)}</div>
        <span className="text-xs text-stone-400">{detail.markers.length} marqueur{detail.markers.length > 1 ? "s" : ""}</span>
      </footer>
    </div>
  );
}

function ReviewPanel({ detail }: { detail: CourseDetail }) {
  if (!detail.analysis) return <section className="grid h-full place-items-center"><div className="max-w-md text-center"><h2 className="text-lg font-semibold">Supports de révision</h2><p className="mt-2 text-sm leading-6 text-stone-500">Une fois l'analyse lancée depuis Révisions, la fiche, les flashcards et le quiz apparaîtront ici.</p></div></section>;
  const analysis = detail.analysis;
  return <section className="mx-auto h-full w-full max-w-5xl overflow-y-auto px-10 py-8">
    <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">Résumé du cours</p><h2 className="mt-2 text-2xl font-semibold leading-tight">{analysis.quickSummary}</h2>
    <div className="mt-8 grid grid-cols-2 gap-8"><div><h3 className="mb-3 text-sm font-semibold">Explicitement dit</h3><ul className="space-y-2 text-sm leading-6 text-stone-600">{analysis.explicitPoints.map((item) => <li key={item}>• {item}</li>)}</ul></div><div><h3 className="mb-3 text-sm font-semibold">Probablement important</h3><ul className="space-y-2 text-sm leading-6 text-stone-600">{analysis.inferredImportantPoints.map((item) => <li key={item}>• {item}</li>)}</ul></div></div>
    {analysis.structuredCourse && <div className="mt-10"><h3 className="mb-3 text-lg font-semibold">Cours restructuré</h3><p className="whitespace-pre-wrap text-sm leading-7 text-stone-600">{analysis.structuredCourse}</p></div>}
    {(analysis.assignmentsAndDates.length > 0 || analysis.examMentions.length > 0 || analysis.examples.length > 0) && <div className="mt-10 grid grid-cols-3 gap-4"><ReviewList title="Consignes et dates" items={analysis.assignmentsAndDates} /><ReviewList title="Mentions d'examen" items={analysis.examMentions} /><ReviewList title="Exemples" items={analysis.examples} /></div>}
    {analysis.revisionSheet && <div className="mt-10 rounded-xl border border-stone-200 bg-[#fffefa] p-6"><p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">Fiche de révision</p><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-700">{analysis.revisionSheet}</p></div>}
    {analysis.definitions.length > 0 && <div className="mt-10"><h3 className="mb-4 text-lg font-semibold">Définitions</h3><div className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">{analysis.definitions.map((item) => <div key={item.term} className="grid grid-cols-[180px_1fr] gap-5 p-4"><span className="text-sm font-medium">{item.term}</span><p className="text-sm leading-6 text-stone-600">{item.definition}</p></div>)}</div></div>}
    {analysis.flashcards.length > 0 && <div className="mt-10"><h3 className="mb-4 text-lg font-semibold">Flashcards</h3><div className="grid grid-cols-2 gap-3">{analysis.flashcards.map((card) => <details key={card.front} className="group rounded-xl border border-stone-200 bg-white p-4"><summary className="cursor-pointer list-none text-sm font-medium">{card.front}<span className="float-right text-stone-300 group-open:rotate-45">+</span></summary><p className="mt-3 border-t border-stone-100 pt-3 text-sm leading-6 text-stone-600">{card.back}</p></details>)}</div></div>}
    {analysis.quiz.length > 0 && <div className="mt-10"><h3 className="mb-4 text-lg font-semibold">Quiz</h3><div className="space-y-3">{analysis.quiz.map((item, index) => <details key={item.question} className="rounded-xl border border-stone-200 bg-white p-5"><summary className="cursor-pointer list-none text-sm font-medium">{index + 1}. {item.question}</summary><ol className="mt-3 space-y-1 pl-5 text-sm text-stone-600">{item.options.map((option, optionIndex) => <li key={option} className={optionIndex === item.answer ? "font-medium text-emerald-700" : ""}>{String.fromCharCode(65 + optionIndex)}. {option}</li>)}</ol><p className="mt-3 text-xs leading-5 text-stone-500">{item.explanation}</p></details>)}</div></div>}
    {analysis.reviewQuestions.length > 0 && <div className="my-10"><h3 className="mb-4 text-lg font-semibold">Questions de révision</h3><ol className="space-y-2 pl-5 text-sm leading-6 text-stone-600">{analysis.reviewQuestions.map((question) => <li key={question} className="list-decimal">{question}</li>)}</ol></div>}
  </section>;
}

function ReviewList({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-xl border border-stone-200 bg-white p-4"><h4 className="text-sm font-semibold">{title}</h4>{items.length === 0 ? <p className="mt-2 text-xs text-stone-400">Rien d'explicite dans le cours.</p> : <ul className="mt-3 space-y-2 text-xs leading-5 text-stone-600">{items.map((item) => <li key={item}>• {item}</li>)}</ul>}</div>;
}
