use super::{describe, http_client, snippet, Lang};
use serde::{Deserialize, Serialize};
use std::time::Duration;

// 初回はモデルの読み込みで時間がかかるため長めに取る
const TIMEOUT: Duration = Duration::from_secs(180);

pub fn normalize_base_url(url: &str) -> Result<String, String> {
    let u = url.trim().trim_end_matches('/');
    if u.starts_with("http://") || u.starts_with("https://") {
        Ok(u.to_string())
    } else {
        Err("Ollama の URL は http:// または https:// で始めてください（例: http://localhost:11434）".into())
    }
}

/// TranslateGemma の公式プロンプト形式（本文の前に空行2つ）。目印 {N} を含む場合のみ保持指示を追加
pub fn build_prompt(text: &str, source: Lang, target: Lang) -> String {
    let (s, sc, t, tc) = (source.name(), source.code(), target.name(), target.code());
    let keep = if text.contains('{') && text.contains('}') {
        " Keep placeholders such as {0} exactly as they are."
    } else {
        ""
    };
    format!(
        "You are a professional {s} ({sc}) to {t} ({tc}) translator. Your goal is to accurately convey the meaning and nuances of the original {s} text while adhering to {t} grammar, vocabulary, and cultural sensitivities.\n\
Produce only the {t} translation, without any additional explanations or commentary.{keep} Please translate the following {s} text into {t}:\n\n\n{text}"
    )
}

/// 思考過程を出力するモデル向けに <think>…</think> を除去
pub fn clean_output(raw: &str) -> String {
    let s = match raw.rfind("</think>") {
        Some(i) => &raw[i + "</think>".len()..],
        None => raw,
    };
    s.trim().to_string()
}

#[derive(Serialize)]
struct ChatBody<'a> {
    model: &'a str,
    messages: [Message<'a>; 1],
    stream: bool,
    options: Options,
}

#[derive(Serialize)]
struct Message<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Serialize)]
struct Options {
    temperature: f32,
}

#[derive(Deserialize)]
struct ChatResp {
    message: RespMessage,
}

#[derive(Deserialize)]
struct RespMessage {
    content: String,
}

#[derive(Deserialize)]
struct ErrorResp {
    error: String,
}

#[derive(Deserialize)]
struct TagsResp {
    models: Vec<ModelInfo>,
}

#[derive(Deserialize)]
struct ModelInfo {
    name: String,
}

pub fn error_message(status: u16, body: &str, model: &str) -> String {
    let detail = serde_json::from_str::<ErrorResp>(body)
        .map(|e| e.error)
        .unwrap_or_else(|_| snippet(body));
    if status == 404 {
        format!("Ollama: モデル「{model}」が見つかりません。PowerShell で `ollama pull {model}` を実行してください（{detail}）")
    } else {
        format!("Ollama: HTTP {status}（{detail}）")
    }
}

pub async fn translate(base: &str, model: &str, texts: &[String], source: Lang, target: Lang) -> Result<Vec<String>, String> {
    let client = http_client(TIMEOUT)?;
    let url = format!("{base}/api/chat");
    let mut out = Vec::with_capacity(texts.len());
    for text in texts {
        let prompt = build_prompt(text, source, target);
        let body = ChatBody {
            model,
            messages: [Message { role: "user", content: &prompt }],
            stream: false,
            options: Options { temperature: 0.0 },
        };
        let res = client.post(&url).json(&body).send().await.map_err(|e| describe(&e, "Ollama"))?;
        let status = res.status().as_u16();
        let raw = res.text().await.map_err(|e| describe(&e, "Ollama"))?;
        if !(200..300).contains(&status) {
            return Err(error_message(status, &raw, model));
        }
        let parsed: ChatResp =
            serde_json::from_str(&raw).map_err(|e| format!("Ollama: 応答を解析できません: {e}"))?;
        out.push(clean_output(&parsed.message.content));
    }
    Ok(out)
}

pub async fn list_models(base: &str) -> Result<Vec<String>, String> {
    let client = http_client(Duration::from_secs(10))?;
    let res = client.get(format!("{base}/api/tags")).send().await.map_err(|e| describe(&e, "Ollama"))?;
    let status = res.status().as_u16();
    let raw = res.text().await.map_err(|e| describe(&e, "Ollama"))?;
    if !(200..300).contains(&status) {
        return Err(format!("Ollama: HTTP {status}（{}）", snippet(&raw)));
    }
    let tags: TagsResp =
        serde_json::from_str(&raw).map_err(|e| format!("Ollama: 応答を解析できません: {e}"))?;
    let mut names: Vec<String> = tags.models.into_iter().map(|m| m.name).collect();
    names.sort();
    Ok(names)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_url() {
        assert_eq!(normalize_base_url(" http://localhost:11434/ ").unwrap(), "http://localhost:11434");
        assert!(normalize_base_url("localhost:11434").is_err());
    }

    #[test]
    fn prompt_format() {
        let p = build_prompt("黒髪の少女", Lang::Ja, Lang::En);
        assert!(p.starts_with("You are a professional Japanese (ja) to English (en) translator."));
        assert!(p.ends_with("into English:\n\n\n黒髪の少女"));
        assert!(!p.contains("placeholders"));
        assert!(build_prompt("{0}の少女", Lang::Ja, Lang::En).contains("Keep placeholders such as {0}"));
    }

    #[test]
    fn clean_output_strips_think() {
        assert_eq!(clean_output("<think>hmm</think>\n a girl \n"), "a girl");
        assert_eq!(clean_output("  cat "), "cat");
    }
}
