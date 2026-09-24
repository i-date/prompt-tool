use crate::translator::{deepl, google, ollama, Lang};
use serde::{Deserialize, Serialize};

const KEY_SERVICE: &str = "com.idate.prompttool";

#[derive(Deserialize, Clone, Copy)]
#[serde(rename_all = "lowercase")]
pub enum Provider {
    Deepl,
    Google,
}

impl Provider {
    fn user(self) -> &'static str {
        match self {
            Self::Deepl => "deepl-api-key", // M4 と同じ名前（登録済みキーを引き継ぐ）
            Self::Google => "google-api-key",
        }
    }
    fn label(self) -> &'static str {
        match self {
            Self::Deepl => "DeepL",
            Self::Google => "Google",
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Engine {
    Deepl,
    Google,
    Ollama,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranslateRequest {
    engine: Engine,
    source: Lang,
    target: Lang,
    texts: Vec<String>,
    ollama_url: String,
    ollama_model: String,
}

#[derive(Serialize)]
pub struct KeyStatus {
    registered: bool,
    free: bool,
}

fn entry(p: Provider) -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEY_SERVICE, p.user()).map_err(|e| format!("資格情報マネージャーを利用できません: {e}"))
}

fn load_key(p: Provider) -> Result<Option<String>, String> {
    match entry(p)?.get_password() {
        Ok(k) => Ok(Some(k)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("{} の API キーを読み出せません: {e}", p.label())),
    }
}

fn require_key(p: Provider) -> Result<String, String> {
    load_key(p)?.ok_or_else(|| format!("{} の API キーが未設定です。設定画面で登録してください", p.label()))
}

#[tauri::command]
pub async fn translate_texts(req: TranslateRequest) -> Result<Vec<String>, String> {
    if req.source == req.target {
        return Err("翻訳元と翻訳先の言語が同じです".into());
    }
    if req.texts.is_empty() {
        return Ok(Vec::new());
    }
    match req.engine {
        Engine::Deepl => {
            let key = require_key(Provider::Deepl)?;
            deepl::translate(&key, &req.texts, req.source, req.target).await
        }
        Engine::Google => {
            let key = require_key(Provider::Google)?;
            google::translate(&key, &req.texts, req.source, req.target).await
        }
        Engine::Ollama => {
            let base = ollama::normalize_base_url(&req.ollama_url)?;
            let model = req.ollama_model.trim();
            if model.is_empty() {
                return Err("Ollama のモデル名が未設定です".into());
            }
            ollama::translate(&base, model, &req.texts, req.source, req.target).await
        }
    }
}

#[tauri::command]
pub fn api_key_status(provider: Provider) -> Result<KeyStatus, String> {
    Ok(match load_key(provider)? {
        Some(k) => KeyStatus {
            registered: true,
            free: matches!(provider, Provider::Deepl) && deepl::is_free_key(&k),
        },
        None => KeyStatus { registered: false, free: false },
    })
}

#[tauri::command]
pub fn set_api_key(provider: Provider, key: String) -> Result<(), String> {
    let key = key.trim();
    if key.is_empty() || key.chars().any(char::is_whitespace) {
        return Err("API キーの形式が正しくありません".into());
    }
    entry(provider)?.set_password(key).map_err(|e| format!("API キーを保存できません: {e}"))
}

#[tauri::command]
pub fn delete_api_key(provider: Provider) -> Result<(), String> {
    match entry(provider)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("API キーを削除できません: {e}")),
    }
}

#[tauri::command]
pub async fn deepl_usage() -> Result<deepl::UsageInfo, String> {
    let key = require_key(Provider::Deepl)?;
    deepl::usage(&key).await
}

#[tauri::command]
pub async fn google_test() -> Result<String, String> {
    let key = require_key(Provider::Google)?;
    let out = google::translate(&key, &["テスト".to_string()], Lang::Ja, Lang::En).await?;
    Ok(out.into_iter().next().unwrap_or_default())
}

#[tauri::command]
pub async fn ollama_models(url: String) -> Result<Vec<String>, String> {
    let base = ollama::normalize_base_url(&url)?;
    ollama::list_models(&base).await
}
