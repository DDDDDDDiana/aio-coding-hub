//! Usage: Browse historical Claude/Codex CLI sessions (projects → sessions → messages).

use crate::shared::error::AppError;
use crate::{blocking, cli_sessions};

#[tauri::command]
pub(crate) async fn cli_sessions_projects_list(
    app: tauri::AppHandle,
    source: String,
    wsl_distro: Option<String>,
) -> Result<Vec<cli_sessions::CliSessionsProjectSummary>, String> {
    let source = source.parse::<cli_sessions::CliSessionsSource>()?;
    blocking::run("cli_sessions_projects_list", move || {
        cli_sessions::projects_list(&app, source, wsl_distro.as_deref())
    })
    .await
    .map_err(Into::into)
}

#[tauri::command]
pub(crate) async fn cli_sessions_sessions_list(
    app: tauri::AppHandle,
    source: String,
    project_id: String,
    wsl_distro: Option<String>,
) -> Result<Vec<cli_sessions::CliSessionsSessionSummary>, String> {
    let source = source.parse::<cli_sessions::CliSessionsSource>()?;
    let project_id = project_id.trim().to_string();
    if project_id.is_empty() {
        return Err(AppError::new("SEC_INVALID_INPUT", "projectId is required").into());
    }

    blocking::run("cli_sessions_sessions_list", move || {
        cli_sessions::sessions_list(&app, source, &project_id, wsl_distro.as_deref())
    })
    .await
    .map_err(Into::into)
}

#[tauri::command]
pub(crate) async fn cli_sessions_messages_get(
    app: tauri::AppHandle,
    source: String,
    file_path: String,
    page: u32,
    page_size: u32,
    from_end: Option<bool>,
    wsl_distro: Option<String>,
) -> Result<cli_sessions::CliSessionsPaginatedMessages, String> {
    let source = source.parse::<cli_sessions::CliSessionsSource>()?;
    let file_path = file_path.trim().to_string();
    if file_path.is_empty() {
        return Err(AppError::new("SEC_INVALID_INPUT", "filePath is required").into());
    }

    let from_end = from_end.unwrap_or(true);
    let page = page as usize;
    let page_size = page_size as usize;

    blocking::run("cli_sessions_messages_get", move || {
        cli_sessions::messages_get(
            &app,
            source,
            &file_path,
            page,
            page_size,
            from_end,
            wsl_distro.as_deref(),
        )
    })
    .await
    .map_err(Into::into)
}
