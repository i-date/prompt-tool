use super::{describe, http_client, snippet, Lang};
use serde::{Deserialize, Serialize};
use std::ops::Range;
use std::time::Duration;

const ENDPOINT: &str = "https://translation.googleapis.com/language/translate/v2";
const MAX_SEGMENTS: usize = 100; // API 上限は 128
const MAX_CHARS: usize = 5000; // 1リクエストの推奨上限
const TIMEOUT: Duration = Duration::from_secs(30);

#[derive(Serialize)]
struct Body<'a> {
    q: &'a [String],
    source: &'static str,
    target: &'static str,
    format: &'static str,
}

#[derive(Deserialize)]
struct Resp {
    data: Data,
}

#[derive(Deserialize)]
struct Data {
    translations: Vec<Translation>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Translation {
    translated_text: String,
}

#[derive(Deserialize)]
struct ErrResp {
    error: ErrBody,
}

#[derive(Deserialize)]
struct ErrBody {
    #[serde(default)]
    message: String,
}

/// 件数・文字数の上限を超えないように送信単位を分割する
pub fn plan_chunks(lens: &[usize]) -> Vec<Range<usize>> {
    let mut out = Vec::new();
    let mut start = 0;
    let mut chars = 0;
    for (i, &len) in lens.iter().enumerate() {
        let n = i - start;
        if n > 0 && (n >= MAX_SEGMENTS || chars + len > MAX_CHARS) {
            out.push(start..i);
            start = i;
            chars = 0;
        }
        chars += len;
    }
    if start < lens.len() {
        out.push(start..lens.len());
    }
    out
}

pub fn error_message(status: u16, body: &str) -> String {
    let msg = serde_json::from_str::<ErrResp>(body)
        .map(|e| e.error.message)
        .unwrap_or_else(|_| snippet(body));
    if msg.to_lowercase().contains("api key not valid") {
        return "Google: API キーが無効です。設定画面でキーを確認してください".into();
    }
    match status {
        400 => format!("Google: リクエストが不正です（{msg}）"),
        403 => format!("Google: アクセスが拒否されました。Cloud Translation API の有効化・課金設定・キーの制限を確認してください（{msg}）"),
        429 => "Google: リクエスト数または文字数の上限に達しました。時間をおいて再実行してください".into(),
        500..=599 => format!("Google: サーバーエラーです（HTTP {status}）。時間をおいて再実行してください"),
        _ => format!("Google: HTTP {status}（{msg}）"),
    }
}

pub fn parse_translations(body: &str, expected: usize) -> Result<Vec<String>, String> {
    let r: Resp = serde_json::from_str(body).map_err(|e| format!("Google: 応答を解析できません: {e}"))?;
    if r.data.translations.len() != expected {
        return Err(format!(
            "Google: 翻訳結果の件数が一致しません（送信 {expected} / 受信 {}）",
            r.data.translations.len()
        ));
    }
    Ok(r.data.translations.into_iter().map(|t| t.translated_text).collect())
}

/// texts は HTML としてエスケープ済み（UI 側で notranslate の目印・<br> を付与）
pub async fn translate(key: &str, texts: &[String], source: Lang, target: Lang) -> Result<Vec<String>, String> {
    let client = http_client(TIMEOUT)?;
    let lens: Vec<usize> = texts.iter().map(|t| t.chars().count()).collect();
    let mut out = Vec::with_capacity(texts.len());
    for range in plan_chunks(&lens) {
        let chunk = &texts[range];
        let body = Body { q: chunk, source: source.code(), target: target.code(), format: "html" };
        let res = client
            .post(ENDPOINT)
            .header("x-goog-api-key", key.trim())
            .json(&body)
            .send()
            .await
            .map_err(|e| describe(&e, "Google"))?;
        let status = res.status().as_u16();
        let raw = res.text().await.map_err(|e| describe(&e, "Google"))?;
        if !(200..300).contains(&status) {
            return Err(error_message(status, &raw));
        }
        out.extend(parse_translations(&raw, chunk.len())?);
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn chunks_by_count_and_chars() {
        assert_eq!(plan_chunks(&[1; 250]), vec![0..100, 100..200, 200..250]);
        assert_eq!(plan_chunks(&[3000, 3000, 10]), vec![0..1, 1..3]);
        assert_eq!(plan_chunks(&[9000]), vec![0..1]);
        assert!(plan_chunks(&[]).is_empty());
    }

    #[test]
    fn error_messages() {
        let invalid = r#"{"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT"}}"#;
        assert!(error_message(400, invalid).contains("API キーが無効"));
        assert!(error_message(403, r#"{"error":{"message":"disabled"}}"#).contains("有効化"));
        assert!(error_message(429, "").contains("上限"));
    }

    #[test]
    fn parse_checks_count() {
        let body = r#"{"data":{"translations":[{"translatedText":"cat"}]}}"#;
        assert_eq!(parse_translations(body, 1).unwrap(), vec!["cat".to_string()]);
        assert!(parse_translations(body, 2).is_err());
    }
}
