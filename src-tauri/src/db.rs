use crate::models::*;
use rusqlite::{params, Connection, OptionalExtension};
use std::path::Path;

pub fn open(path: &Path) -> Result<Connection, String> {
    let connection = Connection::open(path).map_err(|e| e.to_string())?;
    connection
        .pragma_update(None, "journal_mode", "WAL")
        .map_err(|e| e.to_string())?;
    connection
        .pragma_update(None, "foreign_keys", "ON")
        .map_err(|e| e.to_string())?;
    connection
        .execute_batch(SCHEMA)
        .map_err(|e| e.to_string())?;
    connection
        .execute(
            "INSERT OR IGNORE INTO semesters (id, name) VALUES (1, 'Semestre 1')",
            [],
        )
        .map_err(|e| e.to_string())?;
    Ok(connection)
}

const SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS semesters (id INTEGER PRIMARY KEY, name TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS subjects (id INTEGER PRIMARY KEY, semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE, name TEXT NOT NULL, color TEXT NOT NULL DEFAULT '#56715f', position INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS courses (id INTEGER PRIMARY KEY, subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE, title TEXT NOT NULL, started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, duration_ms INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft', audio_path TEXT, summary TEXT);
CREATE TABLE IF NOT EXISTS transcript_segments (id INTEGER PRIMARY KEY, course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE, start_ms INTEGER NOT NULL, end_ms INTEGER NOT NULL, text TEXT NOT NULL, confidence REAL);
CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, course_id INTEGER NOT NULL UNIQUE REFERENCES courses(id) ON DELETE CASCADE, timestamp_ms INTEGER NOT NULL DEFAULT 0, body TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS markers (id INTEGER PRIMARY KEY, course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE, timestamp_ms INTEGER NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('important','unclear','review','exam')), label TEXT);
CREATE TABLE IF NOT EXISTS analyses (course_id INTEGER PRIMARY KEY REFERENCES courses(id) ON DELETE CASCADE, provider TEXT NOT NULL, content_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS documents (id INTEGER PRIMARY KEY, course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE, name TEXT NOT NULL, path TEXT NOT NULL, mime_type TEXT, extracted_text TEXT);
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(course_id UNINDEXED, source UNINDEXED, timestamp_ms UNINDEXED, course_title, subject_name, body, tokenize='unicode61 remove_diacritics 2');
CREATE INDEX IF NOT EXISTS idx_courses_subject ON courses(subject_id);
CREATE INDEX IF NOT EXISTS idx_transcript_course_time ON transcript_segments(course_id, start_ms);
CREATE INDEX IF NOT EXISTS idx_markers_course_time ON markers(course_id, timestamp_ms);
"#;

pub fn load_library(connection: &Connection) -> Result<LibraryData, String> {
    let semesters = query_all(
        connection,
        "SELECT id, name FROM semesters ORDER BY position, id",
        [],
        |row| {
            Ok(Semester {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        },
    )?;
    let subjects = query_all(
        connection,
        "SELECT id, semester_id, name, color FROM subjects ORDER BY position, id",
        [],
        |row| {
            Ok(Subject {
                id: row.get(0)?,
                semester_id: row.get(1)?,
                name: row.get(2)?,
                color: row.get(3)?,
            })
        },
    )?;
    let courses = query_courses(connection, None)?;
    Ok(LibraryData {
        semesters,
        subjects,
        courses,
    })
}

fn query_all<T, P, F>(
    connection: &Connection,
    sql: &str,
    params: P,
    mapper: F,
) -> Result<Vec<T>, String>
where
    P: rusqlite::Params,
    F: FnMut(&rusqlite::Row<'_>) -> rusqlite::Result<T>,
{
    let mut statement = connection.prepare(sql).map_err(|e| e.to_string())?;
    let rows = statement
        .query_map(params, mapper)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

fn query_courses(connection: &Connection, id: Option<i64>) -> Result<Vec<Course>, String> {
    let sql = "SELECT c.id, c.subject_id, s.name, c.title, c.started_at, c.duration_ms, c.status, c.audio_path, c.summary FROM courses c JOIN subjects s ON s.id=c.subject_id WHERE (?1 IS NULL OR c.id=?1) ORDER BY c.started_at DESC, c.id DESC";
    query_all(connection, sql, params![id], |row| {
        Ok(Course {
            id: row.get(0)?,
            subject_id: row.get(1)?,
            subject_name: row.get(2)?,
            title: row.get(3)?,
            started_at: row.get(4)?,
            duration_ms: row.get(5)?,
            status: row.get(6)?,
            audio_path: row.get(7)?,
            summary: row.get(8)?,
        })
    })
}

pub fn create_subject(
    connection: &Connection,
    semester_id: i64,
    name: &str,
) -> Result<i64, String> {
    connection
        .execute(
            "INSERT INTO subjects (semester_id, name) VALUES (?1, ?2)",
            params![semester_id, name],
        )
        .map_err(|e| e.to_string())?;
    Ok(connection.last_insert_rowid())
}

pub fn create_course(connection: &Connection, subject_id: i64, title: &str) -> Result<i64, String> {
    connection
        .execute(
            "INSERT INTO courses (subject_id, title) VALUES (?1, ?2)",
            params![subject_id, title],
        )
        .map_err(|e| e.to_string())?;
    let id = connection.last_insert_rowid();
    rebuild_search(connection, id)?;
    Ok(id)
}

pub fn load_course(connection: &Connection, course_id: i64) -> Result<CourseDetail, String> {
    let course = query_courses(connection, Some(course_id))?
        .into_iter()
        .next()
        .ok_or_else(|| "Cours introuvable".to_string())?;
    let transcript = query_all(connection, "SELECT id, course_id, start_ms, end_ms, text, confidence FROM transcript_segments WHERE course_id=?1 ORDER BY start_ms", params![course_id], |row| Ok(TranscriptSegment { id: row.get(0)?, course_id: row.get(1)?, start_ms: row.get(2)?, end_ms: row.get(3)?, text: row.get(4)?, confidence: row.get(5)? }))?;
    let notes = query_all(
        connection,
        "SELECT id, course_id, timestamp_ms, body FROM notes WHERE course_id=?1",
        params![course_id],
        |row| {
            Ok(Note {
                id: row.get(0)?,
                course_id: row.get(1)?,
                timestamp_ms: row.get(2)?,
                body: row.get(3)?,
            })
        },
    )?;
    let markers = query_all(connection, "SELECT id, course_id, timestamp_ms, kind, label FROM markers WHERE course_id=?1 ORDER BY timestamp_ms", params![course_id], |row| Ok(Marker { id: row.get(0)?, course_id: row.get(1)?, timestamp_ms: row.get(2)?, kind: row.get(3)?, label: row.get(4)? }))?;
    let analysis_json: Option<String> = connection
        .query_row(
            "SELECT content_json FROM analyses WHERE course_id=?1",
            params![course_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    let analysis = analysis_json.and_then(|json| serde_json::from_str(&json).ok());
    Ok(CourseDetail {
        course,
        transcript,
        notes,
        markers,
        analysis,
    })
}

pub fn save_note(
    connection: &Connection,
    course_id: i64,
    body: &str,
    timestamp_ms: i64,
) -> Result<i64, String> {
    connection.execute("INSERT INTO notes(course_id,timestamp_ms,body) VALUES(?1,?2,?3) ON CONFLICT(course_id) DO UPDATE SET timestamp_ms=excluded.timestamp_ms, body=excluded.body, updated_at=CURRENT_TIMESTAMP", params![course_id, timestamp_ms, body]).map_err(|e| e.to_string())?;
    rebuild_search(connection, course_id)?;
    connection
        .query_row(
            "SELECT id FROM notes WHERE course_id=?1",
            params![course_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())
}

pub fn add_marker(
    connection: &Connection,
    course_id: i64,
    kind: &str,
    timestamp_ms: i64,
) -> Result<Marker, String> {
    if !["important", "unclear", "review", "exam"].contains(&kind) {
        return Err("Type de marqueur invalide".into());
    }
    connection
        .execute(
            "INSERT INTO markers(course_id,timestamp_ms,kind) VALUES(?1,?2,?3)",
            params![course_id, timestamp_ms, kind],
        )
        .map_err(|e| e.to_string())?;
    Ok(Marker {
        id: connection.last_insert_rowid(),
        course_id,
        timestamp_ms,
        kind: kind.into(),
        label: None,
    })
}

pub fn replace_transcript(
    connection: &mut Connection,
    course_id: i64,
    segments: &[TranscriptSegment],
) -> Result<(), String> {
    let transaction = connection.transaction().map_err(|e| e.to_string())?;
    transaction
        .execute(
            "DELETE FROM transcript_segments WHERE course_id=?1",
            params![course_id],
        )
        .map_err(|e| e.to_string())?;
    {
        let mut statement = transaction.prepare("INSERT INTO transcript_segments(course_id,start_ms,end_ms,text,confidence) VALUES(?1,?2,?3,?4,?5)").map_err(|e| e.to_string())?;
        for segment in segments {
            statement
                .execute(params![
                    course_id,
                    segment.start_ms,
                    segment.end_ms,
                    segment.text,
                    segment.confidence
                ])
                .map_err(|e| e.to_string())?;
        }
    }
    transaction.commit().map_err(|e| e.to_string())?;
    rebuild_search(connection, course_id)
}

pub fn store_analysis(
    connection: &Connection,
    course_id: i64,
    provider: &str,
    analysis: &CourseAnalysis,
) -> Result<(), String> {
    let json = serde_json::to_string(analysis).map_err(|e| e.to_string())?;
    connection.execute("INSERT INTO analyses(course_id,provider,content_json) VALUES(?1,?2,?3) ON CONFLICT(course_id) DO UPDATE SET provider=excluded.provider,content_json=excluded.content_json,created_at=CURRENT_TIMESTAMP", params![course_id, provider, json]).map_err(|e| e.to_string())?;
    connection
        .execute(
            "UPDATE courses SET summary=?1 WHERE id=?2",
            params![analysis.quick_summary, course_id],
        )
        .map_err(|e| e.to_string())?;
    rebuild_search(connection, course_id)
}

pub fn analysis_source(connection: &Connection, course_id: i64) -> Result<String, String> {
    let detail = load_course(connection, course_id)?;
    let transcript = detail
        .transcript
        .iter()
        .map(|s| format!("[{}ms] {}", s.start_ms, s.text))
        .collect::<Vec<_>>()
        .join("\n");
    let notes = detail
        .notes
        .iter()
        .map(|n| n.body.as_str())
        .collect::<Vec<_>>()
        .join("\n");
    let markers = detail
        .markers
        .iter()
        .map(|m| format!("[{}ms] {}", m.timestamp_ms, m.kind))
        .collect::<Vec<_>>()
        .join("\n");
    Ok(format!(
        "TITRE: {}\nMATIERE: {}\n\nTRANSCRIPTION:\n{}\n\nNOTES PERSONNELLES:\n{}\n\nMARQUEURS:\n{}",
        detail.course.title, detail.course.subject_name, transcript, notes, markers
    ))
}

pub fn search(connection: &Connection, query: &str) -> Result<Vec<SearchResult>, String> {
    let safe_query = format!("\"{}\"", query.replace('"', "\"\""));
    query_all(connection, "SELECT CAST(course_id AS INTEGER), course_title, subject_name, CAST(timestamp_ms AS INTEGER), source, snippet(search_index, 5, '<mark>', '</mark>', '…', 18) FROM search_index WHERE search_index MATCH ?1 ORDER BY rank LIMIT 50", params![safe_query], |row| Ok(SearchResult { course_id: row.get(0)?, course_title: row.get(1)?, subject_name: row.get(2)?, timestamp_ms: row.get(3)?, source: row.get(4)?, excerpt: row.get(5)? }))
}

pub fn rebuild_search(connection: &Connection, course_id: i64) -> Result<(), String> {
    connection
        .execute(
            "DELETE FROM search_index WHERE course_id=?1",
            params![course_id],
        )
        .map_err(|e| e.to_string())?;
    connection.execute("INSERT INTO search_index(course_id,source,timestamp_ms,course_title,subject_name,body) SELECT c.id,'title',0,c.title,s.name,c.title FROM courses c JOIN subjects s ON s.id=c.subject_id WHERE c.id=?1", params![course_id]).map_err(|e| e.to_string())?;
    connection.execute("INSERT INTO search_index(course_id,source,timestamp_ms,course_title,subject_name,body) SELECT c.id,'transcript',t.start_ms,c.title,s.name,t.text FROM transcript_segments t JOIN courses c ON c.id=t.course_id JOIN subjects s ON s.id=c.subject_id WHERE c.id=?1", params![course_id]).map_err(|e| e.to_string())?;
    connection.execute("INSERT INTO search_index(course_id,source,timestamp_ms,course_title,subject_name,body) SELECT c.id,'note',n.timestamp_ms,c.title,s.name,n.body FROM notes n JOIN courses c ON c.id=n.course_id JOIN subjects s ON s.id=c.subject_id WHERE c.id=?1", params![course_id]).map_err(|e| e.to_string())?;
    connection.execute("INSERT INTO search_index(course_id,source,timestamp_ms,course_title,subject_name,body) SELECT c.id,'summary',0,c.title,s.name,c.summary FROM courses c JOIN subjects s ON s.id=c.subject_id WHERE c.id=?1 AND c.summary IS NOT NULL", params![course_id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn course_round_trip_and_search() {
        let connection = open(Path::new(":memory:")).expect("database opens");
        let subject_id = create_subject(&connection, 1, "Physique").expect("subject created");
        let course_id = create_course(&connection, subject_id, "Optique").expect("course created");
        save_note(
            &connection,
            course_id,
            "La diffraction est importante",
            1_500,
        )
        .expect("note saved");
        add_marker(&connection, course_id, "important", 1_500).expect("marker saved");
        let mut connection = connection;
        replace_transcript(
            &mut connection,
            course_id,
            &[TranscriptSegment {
                id: 0,
                course_id,
                start_ms: 1_000,
                end_ms: 2_000,
                text: "Une onde lumineuse".into(),
                confidence: Some(0.9),
            }],
        )
        .expect("transcript saved");
        let detail = load_course(&connection, course_id).expect("course loaded");
        assert_eq!(detail.transcript.len(), 1);
        assert_eq!(detail.markers.len(), 1);
        assert_eq!(
            search(&connection, "diffraction")
                .expect("search works")
                .len(),
            1
        );
    }
}
