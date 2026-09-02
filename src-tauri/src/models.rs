use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Semester {
    pub id: i64,
    pub name: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Subject {
    pub id: i64,
    pub semester_id: i64,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Course {
    pub id: i64,
    pub subject_id: i64,
    pub subject_name: String,
    pub title: String,
    pub started_at: String,
    pub duration_ms: i64,
    pub status: String,
    pub audio_path: Option<String>,
    pub summary: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptSegment {
    #[serde(default)]
    pub id: i64,
    pub course_id: i64,
    pub start_ms: i64,
    pub end_ms: i64,
    pub text: String,
    pub confidence: Option<f64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: i64,
    pub course_id: i64,
    pub timestamp_ms: i64,
    pub body: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Marker {
    pub id: i64,
    pub course_id: i64,
    pub timestamp_ms: i64,
    pub kind: String,
    pub label: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryData {
    pub semesters: Vec<Semester>,
    pub subjects: Vec<Subject>,
    pub courses: Vec<Course>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CourseDetail {
    pub course: Course,
    pub transcript: Vec<TranscriptSegment>,
    pub notes: Vec<Note>,
    pub markers: Vec<Marker>,
    pub analysis: Option<CourseAnalysis>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Definition {
    pub term: String,
    pub definition: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Flashcard {
    pub front: String,
    pub back: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QuizItem {
    pub question: String,
    pub options: Vec<String>,
    pub answer: usize,
    pub explanation: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CourseAnalysis {
    pub quick_summary: String,
    pub structured_course: String,
    pub explicit_points: Vec<String>,
    pub inferred_important_points: Vec<String>,
    pub definitions: Vec<Definition>,
    pub examples: Vec<String>,
    pub assignments_and_dates: Vec<String>,
    pub exam_mentions: Vec<String>,
    pub revision_sheet: String,
    pub flashcards: Vec<Flashcard>,
    pub quiz: Vec<QuizItem>,
    pub review_questions: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub course_id: i64,
    pub course_title: String,
    pub subject_name: String,
    pub timestamp_ms: i64,
    pub source: String,
    pub excerpt: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WhisperStatus {
    pub binary_available: bool,
    pub model_available: bool,
    pub model_path: Option<String>,
    pub message: String,
}
