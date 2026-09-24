mod commands;
mod translator;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::files::read_text_file,
            commands::files::read_text_file_opt,
            commands::files::write_text_file,
            commands::files::resolve_prompt_dir,
            commands::app_data::load_phrases_file,
            commands::app_data::save_phrases_file,
            commands::app_data::export_text_file,
            commands::app_data::import_text_file,
            commands::translate::translate_texts,
            commands::translate::api_key_status,
            commands::translate::set_api_key,
            commands::translate::delete_api_key,
            commands::translate::deepl_usage,
            commands::translate::google_test,
            commands::translate::ollama_models,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
