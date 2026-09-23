//! フレーズデータ (%APPDATA%\<identifier>\phrases.json) の読み書きと、
//! フレーズのエクスポート／取り込み用ファイル I/O。
use serde::Serialize;
use std::fs;
use std::io::{ErrorKind, Write};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

const MAIN_FILE: &str = "phrases.json";
const BACKUP_FILE: &str = "phrases.json.bak";
const BOM: &[u8] = &[0xEF, 0xBB, 0xBF];

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PhraseFiles {
    pub main: Option<String>,
    pub main_exists: bool,
    pub backup: Option<String>,
}

/// 存在しなければ Ok(None)。UTF-8 でなければ Err。先頭 BOM は除去。
fn read_text(path: &Path) -> Result<Option<String>, String> {
    match fs::read(path) {
        Ok(bytes) => {
            let body = bytes.strip_prefix(BOM).unwrap_or(&bytes);
            String::from_utf8(body.to_vec())
                .map(Some)
                .map_err(|_| format!("UTF-8 のテキストではありません: {}", path.display()))
        }
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(None),
        Err(e) => Err(format!("読み込みに失敗しました: {}: {e}", path.display())),
    }
}

/// 一時ファイルに書いてから置き換える（途中で落ちても元ファイルが壊れない）
fn write_atomic(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let mut tmp = path.as_os_str().to_owned();
    tmp.push(".tmp");
    let tmp = PathBuf::from(tmp);
    let write = || -> std::io::Result<()> {
        let mut f = fs::File::create(&tmp)?;
        f.write_all(bytes)?;
        f.sync_all()
    };
    if let Err(e) = write().and_then(|_| fs::rename(&tmp, path)) {
        let _ = fs::remove_file(&tmp);
        return Err(format!("書き込みに失敗しました: {}: {e}", path.display()));
    }
    Ok(())
}

fn load_from(dir: &Path) -> PhraseFiles {
    let main_path = dir.join(MAIN_FILE);
    PhraseFiles {
        main_exists: main_path.exists(),
        main: read_text(&main_path).ok().flatten(),
        backup: read_text(&dir.join(BACKUP_FILE)).ok().flatten(),
    }
}

fn save_to(dir: &Path, text: &str) -> Result<(), String> {
    serde_json::from_str::<serde_json::Value>(text)
        .map_err(|e| format!("保存データが JSON として不正です: {e}"))?;
    fs::create_dir_all(dir).map_err(|e| format!("フォルダを作成できません: {e}"))?;
    let main_path = dir.join(MAIN_FILE);
    // 現在の本体が正常な JSON のときだけ .bak へ回す（壊れた本体で正常な .bak を潰さない）
    if let Ok(Some(current)) = read_text(&main_path) {
        if serde_json::from_str::<serde_json::Value>(&current).is_ok() {
            write_atomic(&dir.join(BACKUP_FILE), current.as_bytes())?;
        }
    }
    write_atomic(&main_path, text.as_bytes())
}

fn app_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path().app_data_dir().map_err(|e| format!("保存先フォルダを取得できません: {e}"))
}

#[tauri::command]
pub fn load_phrases_file(app: AppHandle) -> Result<PhraseFiles, String> {
    Ok(load_from(&app_dir(&app)?))
}

#[tauri::command]
pub fn save_phrases_file(app: AppHandle, text: String) -> Result<(), String> {
    save_to(&app_dir(&app)?, &text)
}

#[tauri::command]
pub fn export_text_file(path: String, contents: String, bom: bool) -> Result<(), String> {
    let mut bytes = Vec::with_capacity(contents.len() + BOM.len());
    if bom {
        bytes.extend_from_slice(BOM);
    }
    bytes.extend_from_slice(contents.as_bytes());
    write_atomic(Path::new(&path), &bytes)
}

#[tauri::command]
pub fn import_text_file(path: String) -> Result<String, String> {
    read_text(Path::new(&path))?.ok_or_else(|| format!("ファイルが見つかりません: {path}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("prompt-tool-test-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn load_from_empty_dir() {
        let d = temp_dir("empty");
        assert_eq!(load_from(&d), PhraseFiles { main: None, main_exists: false, backup: None });
    }

    #[test]
    fn second_save_moves_previous_to_backup() {
        let d = temp_dir("backup");
        save_to(&d, r#"{"v":1}"#).unwrap();
        assert!(!d.join(BACKUP_FILE).exists());
        save_to(&d, r#"{"v":2}"#).unwrap();
        let f = load_from(&d);
        assert_eq!(f.main.as_deref(), Some(r#"{"v":2}"#));
        assert_eq!(f.backup.as_deref(), Some(r#"{"v":1}"#));
    }

    #[test]
    fn broken_main_does_not_overwrite_backup() {
        let d = temp_dir("broken");
        fs::write(d.join(BACKUP_FILE), r#"{"good":true}"#).unwrap();
        fs::write(d.join(MAIN_FILE), "{broken").unwrap();
        save_to(&d, r#"{"new":true}"#).unwrap();
        assert_eq!(fs::read_to_string(d.join(BACKUP_FILE)).unwrap(), r#"{"good":true}"#);
    }

    #[test]
    fn invalid_json_is_rejected() {
        let d = temp_dir("invalid");
        assert!(save_to(&d, "not json").is_err());
        assert!(!d.join(MAIN_FILE).exists());
    }

    #[test]
    fn export_with_bom_and_import_strips_it() {
        let d = temp_dir("bom");
        let p = d.join("a.csv").to_string_lossy().into_owned();
        export_text_file(p.clone(), "ja,en\r\n".into(), true).unwrap();
        assert!(fs::read(&p).unwrap().starts_with(BOM));
        assert_eq!(import_text_file(p).unwrap(), "ja,en\r\n");
    }
}
