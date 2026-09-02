export type View = "courses" | "search" | "review" | "settings";

export type MarkerKind = "important" | "unclear" | "review" | "exam";

export interface Semester {
  id: number;
  name: string;
}

export interface Subject {
  id: number;
  semesterId: number;
  name: string;
  color: string;
}

export interface Course {
  id: number;
  subjectId: number;
  subjectName: string;
  title: string;
  startedAt: string;
  durationMs: number;
  status: "draft" | "recording" | "complete";
  audioPath?: string;
  summary?: string;
}

export interface TranscriptSegment {
  id: number;
  courseId: number;
  startMs: number;
  endMs: number;
  text: string;
  confidence?: number;
}

export interface Note {
  id: number;
  courseId: number;
  timestampMs: number;
  body: string;
}

export interface Marker {
  id: number;
  courseId: number;
  timestampMs: number;
  kind: MarkerKind;
  label?: string;
}

export interface CourseDetail {
  course: Course;
  transcript: TranscriptSegment[];
  notes: Note[];
  markers: Marker[];
  analysis?: CourseAnalysis;
}

export interface CourseAnalysis {
  quickSummary: string;
  structuredCourse: string;
  explicitPoints: string[];
  inferredImportantPoints: string[];
  definitions: Array<{ term: string; definition: string }>;
  examples: string[];
  assignmentsAndDates: string[];
  examMentions: string[];
  revisionSheet: string;
  flashcards: Array<{ front: string; back: string }>;
  quiz: Array<{ question: string; options: string[]; answer: number; explanation: string }>;
  reviewQuestions: string[];
}

export interface LibraryData {
  semesters: Semester[];
  subjects: Subject[];
  courses: Course[];
}

export interface SearchResult {
  courseId: number;
  courseTitle: string;
  subjectName: string;
  timestampMs: number;
  source: "title" | "transcript" | "note" | "summary";
  excerpt: string;
}

export type WhisperProfile = "fast" | "balanced" | "accurate";

export interface WhisperStatus {
  binaryAvailable: boolean;
  modelAvailable: boolean;
  modelPath?: string;
  message: string;
}
