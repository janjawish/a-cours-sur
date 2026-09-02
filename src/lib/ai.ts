import type { CourseAnalysis } from "../types";
import { analyzeCourse } from "./api";

export interface AIProvider {
  readonly id: "gemini" | "codex";
  readonly name: string;
  analyze(courseId: number): Promise<CourseAnalysis>;
}

export class GeminiProvider implements AIProvider {
  readonly id = "gemini" as const;
  readonly name = "Gemini";
  analyze(courseId: number) {
    return analyzeCourse(courseId, this.id);
  }
}

export class CodexProvider implements AIProvider {
  readonly id = "codex" as const;
  readonly name = "Codex";
  analyze(courseId: number) {
    return analyzeCourse(courseId, this.id);
  }
}
