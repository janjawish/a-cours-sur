use crate::models::{TranscriptSegment, WhisperStatus};
use futures_util::StreamExt;
use serde_json::Value;
use std::{
    path::{Path, PathBuf},
    process::Stdio,
};
use tokio::{fs, io::AsyncWriteExt, process::Command};

pub struct WhisperProfile {
    pub model: &'static str,
    pub url: &'static str,
}

pub fn profile(name: &str) -> Result<WhisperProfile, String> {
    match name {
        "fast" => Ok(WhisperProfile {
            model: "tiny",
            url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
        }),
        "balanced" => Ok(WhisperProfile {
            model: "base",
            url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
        }),
        "accurate" => Ok(WhisperProfile {
            model: "small",
            url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin",
        }),
        _ => Err("Profil Whisper inconnu".into()),
    }
}

pub fn find_binary(app_data: &Path) -> Option<PathBuf> {
    let local = app_data.join("tools").join("whisper-cli.exe");
    if local.is_file() {
        return Some(local);
    }
    std::env::var_os("WHISPER_CPP_BIN")
        .map(PathBuf::from)
        .filter(|p| p.is_file())
}

pub fn status(app_data: &Path, name: &str) -> Result<WhisperStatus, String> {
    let selected = profile(name)?;
    let model_path = app_data
        .join("models")
        .join(format!("ggml-{}.bin", selected.model));
    let binary_available = find_binary(app_data).is_some();
    let model_available = model_path.is_file();
    let message = if !binary_available { "whisper-cli.exe n'est pas encore installé. Placez la distribution Windows officielle dans le dossier tools de l'application ou définissez WHISPER_CPP_BIN." } else if !model_available { "Le modèle doit être téléchargé avant la transcription." } else { "Whisper est prêt et fonctionne localement." }.to_string();
    Ok(WhisperStatus {
        binary_available,
        model_available,
        model_path: model_available.then(|| model_path.to_string_lossy().into_owned()),
        message,
    })
}

pub async fn download_model(
    client: &reqwest::Client,
    app_data: &Path,
    name: &str,
) -> Result<String, String> {
    let selected = profile(name)?;
    let directory = app_data.join("models");
    fs::create_dir_all(&directory)
        .await
        .map_err(|e| e.to_string())?;
    let target = directory.join(format!("ggml-{}.bin", selected.model));
    if target.is_file() {
        return Ok(target.to_string_lossy().into_owned());
    }
    let temporary = target.with_extension("bin.download");
    let response = client
        .get(selected.url)
        .send()
        .await
        .map_err(|e| format!("Téléchargement impossible: {e}"))?
        .error_for_status()
        .map_err(|e| e.to_string())?;
    let mut file = fs::File::create(&temporary)
        .await
        .map_err(|e| e.to_string())?;
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        file.write_all(&chunk.map_err(|e| e.to_string())?)
            .await
            .map_err(|e| e.to_string())?;
    }
    file.flush().await.map_err(|e| e.to_string())?;
    drop(file);
    fs::rename(&temporary, &target)
        .await
        .map_err(|e| e.to_string())?;
    Ok(target.to_string_lossy().into_owned())
}

pub async fn transcribe(
    app_data: &Path,
    audio_path: &Path,
    course_id: i64,
    name: &str,
) -> Result<Vec<TranscriptSegment>, String> {
    let selected = profile(name)?;
    let binary = find_binary(app_data).ok_or_else(|| "whisper-cli.exe introuvable. L'audio est sauvegardé et pourra être transcrit plus tard.".to_string())?;
    let model = app_data
        .join("models")
        .join(format!("ggml-{}.bin", selected.model));
    if !model.is_file() {
        return Err("Modèle Whisper absent. Téléchargez-le depuis Paramètres.".into());
    }
    let output_base = app_data
        .join("transcriptions")
        .join(format!("course-{course_id}"));
    if let Some(parent) = output_base.parent() {
        fs::create_dir_all(parent)
            .await
            .map_err(|e| e.to_string())?;
    }
    let result = Command::new(binary)
        .args(["-m"])
        .arg(&model)
        .args(["-f"])
        .arg(audio_path)
        .args(["-l", "fr", "-oj", "-of"])
        .arg(&output_base)
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| e.to_string())?;
    if !result.status.success() {
        return Err(format!(
            "Whisper a échoué: {}",
            String::from_utf8_lossy(&result.stderr)
        ));
    }
    let json_path = output_base.with_extension("json");
    let value: Value =
        serde_json::from_slice(&fs::read(&json_path).await.map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
    let items = value
        .get("transcription")
        .and_then(Value::as_array)
        .ok_or_else(|| "Format JSON Whisper inattendu".to_string())?;
    let segments = items
        .iter()
        .enumerate()
        .filter_map(|(index, item)| {
            let offsets = item.get("offsets")?;
            Some(TranscriptSegment {
                id: index as i64 + 1,
                course_id,
                start_ms: offsets.get("from")?.as_i64()?,
                end_ms: offsets.get("to")?.as_i64()?,
                text: item.get("text")?.as_str()?.trim().to_string(),
                confidence: None,
            })
        })
        .collect();
    Ok(segments)
}
