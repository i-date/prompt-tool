//! 翻訳エンジン（DeepL / Ollama）の HTTP 呼び出し。ランダム構文の処理は UI 側で行う。
pub mod deepl;
pub mod ollama;
pub mod google;

use serde::Deserialize;
use std::time::Duration;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Lang {
    Ja,
    En,
}

impl Lang {
    pub fn name(self) -> &'static str {
        match self {
            Self::Ja => "Japanese",
            Self::En => "English",
        }
    }
    pub fn code(self) -> &'static str {
        match self {
            Self::Ja => "ja",
            Self::En => "en",
        }
    }
}

pub(crate) fn http_client(timeout: Duration) -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(5))
        .timeout(timeout)
        .build()
        .map_err(|e| format!("HTTP クライアントを作成できません: {e}"))
}

pub(crate) fn describe(e: &reqwest::Error, who: &str) -> String {
    if e.is_timeout() {
        format!("{who} の応答がタイムアウトしました")
    } else if e.is_connect() {
        format!("{who} に接続できません（起動状態・URL・ネットワークを確認してください）")
    } else {
        format!("{who} との通信に失敗しました: {e}")
    }
}

pub(crate) fn snippet(s: &str) -> String {
    s.chars().take(200).collect()
}
