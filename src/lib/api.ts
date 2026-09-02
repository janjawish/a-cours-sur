import { invoke } from "@tauri-apps/api/core";
import type {
  CourseAnalysis,
  CourseDetail,
  LibraryData,
  Marker,
  MarkerKind,
  SearchResult,
  WhisperProfile,
  WhisperStatus,
} from "../types";

const browserDemo: LibraryData = {
  semesters: [{ id: 1, name: "Semestre 1" }],
  subjects: [
    { id: 1, semesterId: 1, name: "Biologie cellulaire", color: "#56715f" },
    { id: 2, semesterId: 1, name: "Droit constitutionnel", color: "#876b54" },
  ],
  courses: [
    {
      id: 1,
      subjectId: 1,
      subjectName: "Biologie cellulaire",
      title: "Membrane plasmique et transports",
      startedAt: new Date().toISOString(),
      durationMs: 3_480_000,
      status: "complete",
      summary: "Organisation de la membrane, diffusion et transports actifs.",
    },
  ],
};

const isTauri = () => "__TAURI_INTERNALS__" in window;

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) throw new Error("TAURI_UNAVAILABLE");
  return invoke<T>(command, args);
}

export async function loadLibrary(): Promise<LibraryData> {
  try {
    return await call<LibraryData>("load_library");
  } catch (error) {
    if (!isTauri()) return browserDemo;
    throw error;
  }
}

export async function createSubject(semesterId: number, name: string): Promise<number> {
  return call("create_subject", { semesterId, name });
}

export async function createCourse(subjectId: number, title: string): Promise<number> {
  return call("create_course", { subjectId, title });
}

export async function loadCourse(courseId: number): Promise<CourseDetail> {
  if (!isTauri()) {
    const course = browserDemo.courses[0];
    return {
      course: { ...course, id: courseId },
      transcript: [
        { id: 1, courseId, startMs: 12_000, endMs: 19_000, text: "La membrane plasmique forme une barrière sélective autour de la cellule." },
        { id: 2, courseId, startMs: 23_000, endMs: 33_000, text: "Les phospholipides s'organisent spontanément en bicouche." },
        { id: 3, courseId, startMs: 40_000, endMs: 52_000, text: "Retenez la différence entre transport passif et transport actif pour l'examen." },
      ],
      notes: [{ id: 1, courseId, timestampMs: 28_000, body: "Revoir le schéma de la bicouche et les protéines transmembranaires." }],
      markers: [{ id: 1, courseId, timestampMs: 42_000, kind: "exam" }],
    };
  }
  return call("load_course", { courseId });
}

export const saveNote = (courseId: number, body: string, timestampMs: number) =>
  call<number>("save_note", { courseId, body, timestampMs });

export const addMarker = (courseId: number, kind: MarkerKind, timestampMs: number) =>
  call<Marker>("add_marker", { courseId, kind, timestampMs });

export const startRecording = (courseId: number) =>
  call<string>("start_audio_recording", { courseId });

export const appendAudio = (samples: number[]) =>
  call<void>("append_audio_chunk", { samples });

export const stopRecording = (courseId: number, durationMs: number) =>
  call<string>("stop_audio_recording", { courseId, durationMs });

export const replaceTranscript = (courseId: number, segments: CourseDetail["transcript"]) =>
  call<void>("replace_transcript", { courseId, segments });

export const transcribeCourse = (courseId: number, profile: WhisperProfile) =>
  call<CourseDetail["transcript"]>("transcribe_course", { courseId, profile });

export const whisperStatus = (profile: WhisperProfile) =>
  call<WhisperStatus>("whisper_status", { profile });

export const downloadWhisperModel = (profile: WhisperProfile) =>
  call<string>("download_whisper_model", { profile });

export const saveGeminiKey = (key: string) => call<void>("save_gemini_key", { key });

export const hasGeminiKey = () => call<boolean>("has_gemini_key");

export const analyzeCourse = (courseId: number, provider: "gemini" | "codex") =>
  call<CourseAnalysis>("analyze_course", { courseId, provider });

export const searchCourses = (query: string) =>
  call<SearchResult[]>("search_courses", { query });

export const formatTime = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    : `${minutes}:${seconds.toString().padStart(2, "0")}`;
};
