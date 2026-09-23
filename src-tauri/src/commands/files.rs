use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

const UTF8_BOM: &[u8] = b"\xEF\xBB\xBF";
const DEFAULT_DIR_NAME: &str = "PromptTool";

/// UTF-8 として読み込む（BOM は除去、UTF-8 以外はエラー）
pub(crate) fn read_utf8(path: &Path) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|e| format!("ファイルを読み込めません: {e}"))?;
    let body = bytes.strip_prefix(UTF8_BOM).unwrap_or(&bytes[..]);
    String::from_utf8(body.to_vec()).map_err(|_| "UTF-8 として読み込めないファイルです".to_string())
}

/// 一時ファイルに書いてから置き換える（Windows の rename は既存ファイルを置き換える）
pub(crate) fn write_atomic(path: &Path, contents: &str) -> Result<(), String> {
    let mut tmp = path.as_os_str().to_owned();
    tmp.push(".tmp");
    let tmp = PathBuf::from(tmp);

    fs::write(&tmp, contents).map_err(|e| format!("ファイルを書き込めません: {e}"))?;
    fs::rename(&tmp, path).map_err(|e| {
        let _ = fs::remove_file(&tmp);
        format!("ファイルを保存できません: {e}")
    })
}

#[tauri::command]
pub fn read_text_file(path: String) -> Result<String, String> {
    read_utf8(Path::new(&path))
}

/// 存在しなければ None（外部変更の検出用）
#[tauri::command]
pub fn read_text_file_opt(path: String) -> Result<Option<String>, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Ok(None);
    }
    read_utf8(p).map(Some)
}

#[tauri::command]
pub fn write_text_file(path: String, contents: String) -> Result<(), String> {
    write_atomic(Path::new(&path), &contents)
}

/// 指定フォルダが存在すればそれを返し、無ければ ドキュメント\PromptTool を作成して返す
#[tauri::command]
pub fn resolve_prompt_dir(app: AppHandle, preferred: Option<String>) -> Result<String, String> {
    if let Some(p) = preferred.filter(|p| Path::new(p).is_dir()) {
        return Ok(p);
    }
    let dir = app
        .path()
        .document_dir()
        .map_err(|e| format!("ドキュメントフォルダを取得できません: {e}"))?
        .join(DEFAULT_DIR_NAME);
    fs::create_dir_all(&dir).map_err(|e| format!("既定フォルダを作成できません: {e}"))?;
    Ok(dir.to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("prompt-tool-{name}-{}", std::process::id()));
        fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn write_then_read_roundtrip() {
        let d = temp_dir("roundtrip");
        let p = d.join("a.md");
        write_atomic(&p, "こんにちは\n[a / b]\n").unwrap();
        assert_eq!(read_utf8(&p).unwrap(), "こんにちは\n[a / b]\n");
        fs::remove_dir_all(&d).unwrap();
    }

    #[test]
    fn overwrite_existing_and_no_tmp_left() {
        let d = temp_dir("overwrite");
        let p = d.join("a.md");
        write_atomic(&p, "old").unwrap();
        write_atomic(&p, "new").unwrap();
        assert_eq!(read_utf8(&p).unwrap(), "new");
        assert!(!d.join("a.md.tmp").exists());
        fs::remove_dir_all(&d).unwrap();
    }

    #[test]
    fn strips_bom() {
        let d = temp_dir("bom");
        let p = d.join("a.md");
        fs::write(&p, b"\xEF\xBB\xBFhello").unwrap();
        assert_eq!(read_utf8(&p).unwrap(), "hello");
        fs::remove_dir_all(&d).unwrap();
    }

    #[test]
    fn rejects_non_utf8() {
        let d = temp_dir("sjis");
        let p = d.join("a.md");
        fs::write(&p, [0x82u8, 0xA0]).unwrap(); // Shift_JIS の「あ」
        assert!(read_utf8(&p).is_err());
        fs::remove_dir_all(&d).unwrap();
    }

    #[test]
    fn missing_file_is_none() {
        let d = temp_dir("missing");
        let p = d.join("none.md").to_string_lossy().into_owned();
        assert_eq!(read_text_file_opt(p).unwrap(), None);
        fs::remove_dir_all(&d).unwrap();
    }
}
