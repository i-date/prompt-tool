use super::{describe, http_client, snippet, Lang};
use serde::{Deserialize, Serialize};
use std::time::Duration;

const MAX_TEXTS: usize = 50;
const TIMEOUT: Duration = Duration::from_secs(30);

pub fn is_free_key(key: &str) -> bool {
    key.trim().ends_with(":fx")
}

pub fn base_url(key: &str) -> &'static str {
    if is_free_key(key) {
        "https://api-free.deepl.com"
    } else {
        "https://api.deepl.com"
    }
}

fn source_code(l: Lang) -> &'static str {
    match l {
        Lang::Ja => "JA",
        Lang::En => "EN",
    }
}

fn target_code(l: Lang) -> &'static str {
    match l {
        Lang::Ja => "JA",
        Lang::En => "EN-US",
    }
}

#[derive(Serialize)]
struct TranslateBody<'a> {
    text: &'a [String],
    source_lang: &'static str,
    target_lang: &'static str,
    tag_handling: &'static str,
    preserve_formatting: bool,
}

#[derive(Deserialize)]
struct TranslateResp {
    translations: Vec<Translation>,
}

#[derive(Deserialize)]
struct Translation {
    text: String,
}

#[derive(Deserialize)]
struct UsageResp {
    #[serde(default)]
    character_count: u64,
    #[serde(default)]
    character_limit: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageInfo {
    pub plan: &'static str,
    pub character_count: u64,
    pub character_limit: u64,
}

pub fn error_message(status: u16, body: &str) -> String {
    match status {
        400 => format!("DeepL: リクエストが不正です（{}）", snippet(body)),
        403 => "DeepL: API キーが無効です。設定画面でキーを確認してください".into(),
        413 => "DeepL: 送信する文章が大きすぎます".into(),
        429 => "DeepL: リクエストが多すぎます。少し待ってから再実行してください".into(),
        456 => "DeepL: 今月の文字数上限に達しました".into(),
        500..=599 => format!("DeepL: サーバーエラーです（HTTP {status}）。時間をおいて再実行してください"),
        _ => format!("DeepL: HTTP {status}（{}）", snippet(body)),
    }
}

pub fn parse_translations(body: &str, expected: usize) -> Result<Vec<String>, String> {
    let r: TranslateResp =
        serde_json::from_str(body).map_err(|e| format!("DeepL: 応答を解析できません: {e}"))?;
    if r.translations.len() != expected {
        return Err(format!(
            "DeepL: 翻訳結果の件数が一致しません（送信 {expected} / 受信 {}）",
            r.translations.len()
        ));
    }
    Ok(r.translations.into_iter().map(|t| t.text).collect())
}

async fn send(req: reqwest::RequestBuilder, key: &str) -> Result<String, String> {
    let res = req
        .header("Authorization", format!("DeepL-Auth-Key {}", key.trim()))
        .send()
        .await
        .map_err(|e| describe(&e, "DeepL"))?;
    let status = res.status().as_u16();
    let body = res.text().await.map_err(|e| describe(&e, "DeepL"))?;
    if (200..300).contains(&status) {
        Ok(body)
    } else {
        Err(error_message(status, &body))
    }
}

/// texts は XML としてエスケープ済み（UI 側で `<x i="N"/>` を目印に使う）
pub async fn translate(key: &str, texts: &[String], source: Lang, target: Lang) -> Result<Vec<String>, String> {
    let client = http_client(TIMEOUT)?;
    let url = format!("{}/v2/translate", base_url(key));
    let mut out = Vec::with_capacity(texts.len());
    for chunk in texts.chunks(MAX_TEXTS) {
        let body = TranslateBody {
            text: chunk,
            source_lang: source_code(source),
            target_lang: target_code(target),
            tag_handling: "xml",
            preserve_formatting: true,
        };
        let resp = send(client.post(&url).json(&body), key).await?;
        out.extend(parse_translations(&resp, chunk.len())?);
    }
    Ok(out)
}

pub async fn usage(key: &str) -> Result<UsageInfo, String> {
    let client = http_client(TIMEOUT)?;
    let resp = send(client.get(format!("{}/v2/usage", base_url(key))), key).await?;
    let u: UsageResp =
        serde_json::from_str(&resp).map_err(|e| format!("DeepL: 応答を解析できません: {e}"))?;
    Ok(UsageInfo {
        plan: if is_free_key(key) { "free" } else { "pro" },
        character_count: u.character_count,
        character_limit: u.character_limit,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn free_key_uses_free_endpoint() {
        assert_eq!(base_url("abc:fx"), "https://api-free.deepl.com");
        assert_eq!(base_url(" abc:fx \n"), "https://api-free.deepl.com");
        assert_eq!(base_url("abc"), "https://api.deepl.com");
    }

    #[test]
    fn error_messages_for_key_and_quota() {
        assert!(error_message(403, "").contains("API キーが無効"));
        assert!(error_message(456, "").contains("上限"));
        assert!(error_message(503, "").contains("HTTP 503"));
    }

    #[test]
    fn parse_checks_count() {
        let body = r#"{"translations":[{"detected_source_language":"JA","text":"cat"}]}"#;
        assert_eq!(parse_translations(body, 1).unwrap(), vec!["cat".to_string()]);
        assert!(parse_translations(body, 2).is_err());
    }
}
