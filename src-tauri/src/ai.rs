use crate::models::CourseAnalysis;
use serde_json::{json, Value};

const SERVICE: &str = "fr.acourssur.desktop";
const ACCOUNT: &str = "gemini-api-key";

pub fn save_gemini_key(key: &str) -> Result<(), String> {
    if key.trim().len() < 10 {
        return Err("Clé Gemini invalide".into());
    }
    keyring::Entry::new(SERVICE, ACCOUNT)
        .map_err(|e| e.to_string())?
        .set_password(key.trim())
        .map_err(|e| e.to_string())
}

pub fn has_gemini_key() -> bool {
    keyring::Entry::new(SERVICE, ACCOUNT)
        .ok()
        .and_then(|entry| entry.get_password().ok())
        .is_some_and(|key| !key.is_empty())
}

fn gemini_key() -> Result<String, String> {
    keyring::Entry::new(SERVICE, ACCOUNT)
        .map_err(|e| e.to_string())?
        .get_password()
        .map_err(|_| "Aucune clé Gemini enregistrée dans le coffre Windows.".to_string())
}

pub async fn analyze_gemini(
    client: &reqwest::Client,
    source: &str,
) -> Result<CourseAnalysis, String> {
    let key = gemini_key()?;
    let prompt = format!(
        r#"Tu analyses un cours d'étudiant en français. Utilise UNIQUEMENT les informations de la source. N'invente rien. Si une catégorie n'est pas documentée, renvoie une liste vide ou une chaîne vide. Sépare strictement explicitPoints (dit explicitement par le professeur) et inferredImportantPoints (importance seulement estimée par l'analyse). Renvoie exclusivement un objet JSON valide avec ces clés: quickSummary, structuredCourse, explicitPoints, inferredImportantPoints, definitions (term, definition), examples, assignmentsAndDates, examMentions, revisionSheet, flashcards (front, back), quiz (question, options, answer indexé à partir de 0, explanation), reviewQuestions.

SOURCE DU COURS:
{source}"#
    );
    let response = client.post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent").header("x-goog-api-key", key).json(&json!({
        "contents": [{ "parts": [{ "text": prompt }] }],
        "generationConfig": { "responseMimeType": "application/json", "temperature": 0.1 }
    })).send().await.map_err(|e| format!("Gemini inaccessible: {e}"))?.error_for_status().map_err(|e| format!("Erreur Gemini: {e}"))?;
    let body: Value = response.json().await.map_err(|e| e.to_string())?;
    let text = body
        .pointer("/candidates/0/content/parts/0/text")
        .and_then(Value::as_str)
        .ok_or_else(|| "Réponse Gemini vide ou filtrée".to_string())?;
    let cleaned = text
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();
    serde_json::from_str(cleaned).map_err(|e| format!("Réponse Gemini non conforme: {e}"))
}

pub async fn analyze_codex(_source: &str) -> Result<CourseAnalysis, String> {
    Err("CodexProvider est prêt dans l'architecture mais désactivé pour cette V1. Il sera relié uniquement via le SDK/App Server officiel, sans lecture manuelle de jetons.".into())
}
