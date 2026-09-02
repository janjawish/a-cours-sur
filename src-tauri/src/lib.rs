mod ai;
mod audio;
mod db;
mod models;
mod whisper;

use audio::AudioSession;
use models::*;
use rusqlite::{params, Connection, OptionalExtension};
use std::{fs, path::PathBuf, sync::Mutex};
use tauri::{Manager, State};

struct AppState {
    database: Mutex<Connection>,
    audio: Mutex<Option<AudioSession>>,
    app_data: PathBuf,
    http: reqwest::Client,
}

#[tauri::command]
fn load_library(state: State<'_, AppState>) -> Result<LibraryData, String> {
    let database = state
        .database
        .lock()
        .map_err(|_| "Verrou SQLite empoisonné".to_string())?;
    db::load_library(&database)
}

#[tauri::command]
fn create_subject(
    state: State<'_, AppState>,
    semester_id: i64,
    name: String,
) -> Result<i64, String> {
    let database = state
        .database
        .lock()
        .map_err(|_| "Verrou SQLite empoisonné".to_string())?;
    db::create_subject(&database, semester_id, name.trim())
}

#[tauri::command]
fn create_course(
    state: State<'_, AppState>,
    subject_id: i64,
    title: String,
) -> Result<i64, String> {
    let database = state
        .database
        .lock()
        .map_err(|_| "Verrou SQLite empoisonné".to_string())?;
    db::create_course(&database, subject_id, title.trim())
}

#[tauri::command]
fn load_course(state: State<'_, AppState>, course_id: i64) -> Result<CourseDetail, String> {
    let database = state
        .database
        .lock()
        .map_err(|_| "Verrou SQLite empoisonné".to_string())?;
    db::load_course(&database, course_id)
}

#[tauri::command]
fn save_note(
    state: State<'_, AppState>,
    course_id: i64,
    body: String,
    timestamp_ms: i64,
) -> Result<i64, String> {
    let database = state
        .database
        .lock()
        .map_err(|_| "Verrou SQLite empoisonné".to_string())?;
    db::save_note(&database, course_id, &body, timestamp_ms)
}

#[tauri::command]
fn add_marker(
    state: State<'_, AppState>,
    course_id: i64,
    kind: String,
    timestamp_ms: i64,
) -> Result<Marker, String> {
    let database = state
        .database
        .lock()
        .map_err(|_| "Verrou SQLite empoisonné".to_string())?;
    db::add_marker(&database, course_id, &kind, timestamp_ms)
}

#[tauri::command]
fn start_audio_recording(state: State<'_, AppState>, course_id: i64) -> Result<String, String> {
    let mut slot = state.audio.lock().map_err(|_| "Verrou audio empoisonné")?;
    if slot.is_some() {
        return Err("Un enregistrement est déjà en cours".into());
    }
    let session = AudioSession::start(&state.app_data.join("audio"), course_id)?;
    let path = session.path.to_string_lossy().into_owned();
    state
        .database
        .lock()
        .map_err(|_| "Verrou SQLite empoisonné")?
        .execute(
            "UPDATE courses SET status='recording', audio_path=?1 WHERE id=?2",
            params![path, course_id],
        )
        .map_err(|e| e.to_string())?;
    *slot = Some(session);
    Ok(path)
}

#[tauri::command]
fn append_audio_chunk(state: State<'_, AppState>, samples: Vec<i16>) -> Result<(), String> {
    let mut slot = state.audio.lock().map_err(|_| "Verrou audio empoisonné")?;
    slot.as_mut()
        .ok_or_else(|| "Aucun enregistrement actif".to_string())?
        .append(&samples)
}

#[tauri::command]
fn stop_audio_recording(
    state: State<'_, AppState>,
    course_id: i64,
    duration_ms: i64,
) -> Result<String, String> {
    let session = state
        .audio
        .lock()
        .map_err(|_| "Verrou audio empoisonné")?
        .take()
        .ok_or_else(|| "Aucun enregistrement actif".to_string())?;
    if session.course_id != course_id {
        return Err("Le cours ne correspond pas à l'enregistrement".into());
    }
    let path = session.finish()?.to_string_lossy().into_owned();
    state
        .database
        .lock()
        .map_err(|_| "Verrou SQLite empoisonné")?
        .execute(
            "UPDATE courses SET status='complete', duration_ms=?1, audio_path=?2 WHERE id=?3",
            params![duration_ms, path, course_id],
        )
        .map_err(|e| e.to_string())?;
    Ok(path)
}

#[tauri::command]
fn replace_transcript(
    state: State<'_, AppState>,
    course_id: i64,
    segments: Vec<TranscriptSegment>,
) -> Result<(), String> {
    let mut database = state
        .database
        .lock()
        .map_err(|_| "Verrou SQLite empoisonné".to_string())?;
    db::replace_transcript(&mut database, course_id, &segments)
}

#[tauri::command]
async fn transcribe_course(
    state: State<'_, AppState>,
    course_id: i64,
    profile: String,
) -> Result<Vec<TranscriptSegment>, String> {
    let audio_path: Option<String> = state
        .database
        .lock()
        .map_err(|_| "Verrou SQLite empoisonné")?
        .query_row(
            "SELECT audio_path FROM courses WHERE id=?1",
            params![course_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
        .flatten();
    whisper::transcribe(
        &state.app_data,
        &PathBuf::from(audio_path.ok_or_else(|| "Ce cours n'a pas encore d'audio".to_string())?),
        course_id,
        &profile,
    )
    .await
}

#[tauri::command]
fn whisper_status(state: State<'_, AppState>, profile: String) -> Result<WhisperStatus, String> {
    whisper::status(&state.app_data, &profile)
}

#[tauri::command]
async fn download_whisper_model(
    state: State<'_, AppState>,
    profile: String,
) -> Result<String, String> {
    whisper::download_model(&state.http, &state.app_data, &profile).await
}

#[tauri::command]
fn save_gemini_key(key: String) -> Result<(), String> {
    ai::save_gemini_key(&key)
}

#[tauri::command]
fn has_gemini_key() -> bool {
    ai::has_gemini_key()
}

#[tauri::command]
async fn analyze_course(
    state: State<'_, AppState>,
    course_id: i64,
    provider: String,
) -> Result<CourseAnalysis, String> {
    let source = {
        let database = state
            .database
            .lock()
            .map_err(|_| "Verrou SQLite empoisonné".to_string())?;
        db::analysis_source(&database, course_id)?
    };
    let analysis = match provider.as_str() {
        "gemini" => ai::analyze_gemini(&state.http, &source).await?,
        "codex" => ai::analyze_codex(&source).await?,
        _ => return Err("Fournisseur IA inconnu".into()),
    };
    {
        let database = state
            .database
            .lock()
            .map_err(|_| "Verrou SQLite empoisonné".to_string())?;
        db::store_analysis(&database, course_id, &provider, &analysis)?;
    }
    Ok(analysis)
}

#[tauri::command]
fn search_courses(state: State<'_, AppState>, query: String) -> Result<Vec<SearchResult>, String> {
    if query.trim().len() < 2 {
        return Ok(vec![]);
    }
    let database = state
        .database
        .lock()
        .map_err(|_| "Verrou SQLite empoisonné".to_string())?;
    db::search(&database, query.trim())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
            fs::create_dir_all(&app_data).map_err(|e| e.to_string())?;
            app.manage(AppState {
                database: Mutex::new(db::open(&app_data.join("acourssur.sqlite"))?),
                audio: Mutex::new(None),
                app_data,
                http: reqwest::Client::builder()
                    .user_agent("acourssur/0.1")
                    .build()
                    .map_err(|e| e.to_string())?,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_library,
            create_subject,
            create_course,
            load_course,
            save_note,
            add_marker,
            start_audio_recording,
            append_audio_chunk,
            stop_audio_recording,
            replace_transcript,
            transcribe_course,
            whisper_status,
            download_whisper_model,
            save_gemini_key,
            has_gemini_key,
            analyze_course,
            search_courses
        ])
        .run(tauri::generate_context!())
        .expect("erreur pendant l'exécution de l'application");
}
