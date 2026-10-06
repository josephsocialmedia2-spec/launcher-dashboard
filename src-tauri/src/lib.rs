use chrono::{Datelike, Local, NaiveDate, Timelike};
use rusqlite::Connection;
use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

const DB_NAME: &str = "f1-crm.sqlite";
const APP_FOLDER: &str = "F1Immobiliare";
const BACKUP_TASK_NAME: &str = "F1 Immobiliare Backup";

#[derive(Serialize)]
struct BackupInfo {
    name: String,
    path: String,
    size: u64,
    modified: u64,
}

#[derive(Serialize)]
struct DesktopStatus {
    database_path: String,
    backup_path: String,
    database_size: u64,
    contacts: i64,
    notes: i64,
    latest_backup: Option<String>,
    next_backup: String,
    scheduled_task: bool,
}

fn fallback_root() -> Result<PathBuf, String> {
    let base = dirs::data_local_dir().ok_or_else(|| "Cartella LocalAppData non disponibile".to_string())?;
    Ok(base.join(APP_FOLDER))
}

fn fallback_backup_dir() -> Result<PathBuf, String> {
    let docs = dirs::document_dir().ok_or_else(|| "Cartella Documenti non disponibile".to_string())?;
    Ok(docs.join("F1 Immobiliare").join("Backup"))
}

fn root_for_app(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().app_config_dir().map_err(|e| e.to_string())
}

fn db_path_for_app(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(root_for_app(app)?.join(DB_NAME))
}

fn backup_dir_for_app(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .document_dir()
        .map(|p| p.join("F1 Immobiliare").join("Backup"))
        .map_err(|e| e.to_string())
}

fn escape_sqlite_string(path: &Path) -> String {
    path.to_string_lossy().replace(''', "''")
}

fn rotate_backups(dir: &Path) -> Result<(), String> {
    let mut daily = Vec::new();
    let mut monthly = Vec::new();
    if !dir.exists() {
        return Ok(());
    }
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with("F1_CRM_MONTHLY_") && name.ends_with(".sqlite") {
            monthly.push(entry.path());
        } else if name.starts_with("F1_CRM_") && name.ends_with(".sqlite") {
            daily.push(entry.path());
        }
    }
    daily.sort();
    monthly.sort();
    while daily.len() > 30 {
        let p = daily.remove(0);
        let _ = fs::remove_file(p);
    }
    while monthly.len() > 12 {
        let p = monthly.remove(0);
        let _ = fs::remove_file(p);
    }
    Ok(())
}

fn secondary_dir(root: &Path) -> Option<PathBuf> {
    let p = root.join("secondary-backup.txt");
    let value = fs::read_to_string(p).ok()?.trim().to_string();
    if value.is_empty() {
        None
    } else {
        Some(PathBuf::from(value))
    }
}

fn create_backup_at(db_path: &Path, backup_dir: &Path, root: &Path) -> Result<PathBuf, String> {
    if !db_path.exists() {
        return Err(format!("Database non trovato: {}", db_path.display()));
    }
    fs::create_dir_all(backup_dir).map_err(|e| e.to_string())?;
    let now = Local::now();
    let file_name = format!("F1_CRM_{}.sqlite", now.format("%Y-%m-%d_%H%M%S"));
    let destination = backup_dir.join(file_name);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    conn.execute_batch("PRAGMA wal_checkpoint(FULL);").map_err(|e| e.to_string())?;
    conn.execute_batch(&format!("VACUUM INTO '{}';", escape_sqlite_string(&destination)))
        .map_err(|e| e.to_string())?;

    if now.day() == 1 {
        let monthly = backup_dir.join(format!("F1_CRM_MONTHLY_{}.sqlite", now.format("%Y-%m")));
        if !monthly.exists() {
            fs::copy(&destination, &monthly).map_err(|e| e.to_string())?;
        }
    }

    if let Some(second) = secondary_dir(root) {
        if fs::create_dir_all(&second).is_ok() {
            let second_file = second.join(destination.file_name().unwrap_or_default());
            let _ = fs::copy(&destination, second_file);
        }
    }
    rotate_backups(backup_dir)?;
    Ok(destination)
}

fn latest_backup_path(dir: &Path) -> Option<PathBuf> {
    let mut files: Vec<PathBuf> = fs::read_dir(dir)
        .ok()?
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|p| {
            p.file_name()
                .and_then(|x| x.to_str())
                .map(|n| n.starts_with("F1_CRM_") && !n.starts_with("F1_CRM_MONTHLY_") && n.ends_with(".sqlite"))
                .unwrap_or(false)
        })
        .collect();
    files.sort();
    files.pop()
}

fn backup_date(path: &Path) -> Option<NaiveDate> {
    let name = path.file_name()?.to_str()?;
    let part = name.strip_prefix("F1_CRM_")?.get(0..10)?;
    NaiveDate::parse_from_str(part, "%Y-%m-%d").ok()
}

fn maybe_missed_backup(db: &Path, backup_dir: &Path, root: &Path) {
    if !db.exists() {
        return;
    }
    let now = Local::now();
    let today = now.date_naive();
    let latest = latest_backup_path(backup_dir).and_then(|p| backup_date(&p));
    let should = match latest {
        None => true,
        Some(d) if now.hour() >= 21 => d < today,
        Some(d) => d < today.pred_opt().unwrap_or(today),
    };
    if should {
        let _ = create_backup_at(db, backup_dir, root);
    }
}

#[cfg(target_os = "windows")]
fn ensure_windows_task() -> bool {
    let exe = match std::env::current_exe() {
        Ok(v) => v,
        Err(_) => return false,
    };
    let task_command = format!("\"{}\" --backup-only", exe.display());
    Command::new("schtasks")
        .args([
            "/Create",
            "/F",
            "/SC",
            "DAILY",
            "/ST",
            "21:00",
            "/TN",
            BACKUP_TASK_NAME,
            "/TR",
            &task_command,
        ])
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

#[cfg(not(target_os = "windows"))]
fn ensure_windows_task() -> bool {
    false
}

fn counts(db: &Path) -> (i64, i64) {
    if !db.exists() {
        return (0, 0);
    }
    let Ok(conn) = Connection::open(db) else {
        return (0, 0);
    };
    let contacts = conn
        .query_row("SELECT COUNT(*) FROM contacts WHERE deleted_at IS NULL", [], |r| r.get(0))
        .unwrap_or(0);
    let notes = conn
        .query_row("SELECT COUNT(*) FROM notes WHERE deleted_at IS NULL", [], |r| r.get(0))
        .unwrap_or(0);
    (contacts, notes)
}

#[tauri::command]
fn desktop_status(app: tauri::AppHandle) -> Result<DesktopStatus, String> {
    let root = root_for_app(&app)?;
    let db = db_path_for_app(&app)?;
    let backups = backup_dir_for_app(&app)?;
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    fs::create_dir_all(&backups).map_err(|e| e.to_string())?;
    let (contacts, notes) = counts(&db);
    let latest = latest_backup_path(&backups).map(|p| p.to_string_lossy().to_string());
    let database_size = fs::metadata(&db).map(|m| m.len()).unwrap_or(0);
    Ok(DesktopStatus {
        database_path: db.to_string_lossy().to_string(),
        backup_path: backups.to_string_lossy().to_string(),
        database_size,
        contacts,
        notes,
        latest_backup: latest,
        next_backup: "21:00 ora locale".to_string(),
        scheduled_task: ensure_windows_task(),
    })
}

#[tauri::command]
fn create_backup(app: tauri::AppHandle) -> Result<String, String> {
    let root = root_for_app(&app)?;
    let db = db_path_for_app(&app)?;
    let backups = backup_dir_for_app(&app)?;
    create_backup_at(&db, &backups, &root).map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
fn set_secondary_backup_dir(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let root = root_for_app(&app)?;
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    let clean = path.trim();
    if clean.is_empty() {
        let _ = fs::remove_file(root.join("secondary-backup.txt"));
        return Ok(());
    }
    let p = PathBuf::from(clean);
    fs::create_dir_all(&p).map_err(|e| e.to_string())?;
    fs::write(root.join("secondary-backup.txt"), clean).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_backups(app: tauri::AppHandle) -> Result<Vec<BackupInfo>, String> {
    let dir = backup_dir_for_app(&app)?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|x| x.to_str()) != Some("sqlite") {
            continue;
        }
        let md = entry.metadata().map_err(|e| e.to_string())?;
        let modified = md
            .modified()
            .ok()
            .and_then(|x| x.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|x| x.as_secs())
            .unwrap_or(0);
        out.push(BackupInfo {
            name: entry.file_name().to_string_lossy().to_string(),
            path: path.to_string_lossy().to_string(),
            size: md.len(),
            modified,
        });
    }
    out.sort_by(|a, b| b.name.cmp(&a.name));
    Ok(out)
}

#[tauri::command]
fn restore_backup(app: tauri::AppHandle, backup_path: String) -> Result<(), String> {
    let source = PathBuf::from(backup_path);
    if !source.exists() {
        return Err("Backup non trovato".to_string());
    }
    let root = root_for_app(&app)?;
    let db = db_path_for_app(&app)?;
    let backups = backup_dir_for_app(&app)?;
    if db.exists() {
        let _ = create_backup_at(&db, &backups, &root);
    }
    fs::create_dir_all(db.parent().unwrap_or(&root)).map_err(|e| e.to_string())?;
    fs::copy(source, db).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_all_local_data(app: tauri::AppHandle) -> Result<String, String> {
    let root = root_for_app(&app)?;
    let db = db_path_for_app(&app)?;
    let backups = backup_dir_for_app(&app)?;
    let safety = if db.exists() {
        Some(create_backup_at(&db, &backups, &root)?)
    } else {
        None
    };
    if db.exists() {
        let conn = Connection::open(&db).map_err(|e| e.to_string())?;
        conn.execute_batch(
            "PRAGMA foreign_keys=ON;
             BEGIN IMMEDIATE;
             DELETE FROM notes;
             DELETE FROM tasks;
             DELETE FROM contacts;
             COMMIT;",
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(safety
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "Nessun database esistente".to_string()))
}

#[tauri::command]
fn delete_backups(app: tauri::AppHandle) -> Result<u32, String> {
    let dir = backup_dir_for_app(&app)?;
    let mut deleted = 0u32;
    if !dir.exists() {
        return Ok(0);
    }
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|x| x.to_str()) == Some("sqlite") && fs::remove_file(&path).is_ok() {
            deleted += 1;
        }
    }
    Ok(deleted)
}

#[tauri::command]
fn open_backup_dir(app: tauri::AppHandle) -> Result<String, String> {
    let dir = backup_dir_for_app(&app)?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("explorer").arg(&dir).spawn();
    }
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
fn ensure_backup_task() -> bool {
    ensure_windows_task()
}

pub fn run_backup_only() -> Result<(), String> {
    let root = fallback_root()?;
    let db = root.join(DB_NAME);
    let backups = fallback_backup_dir()?;
    create_backup_at(&db, &backups, &root).map(|_| ())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create_local_crm",
        sql: include_str!("../migrations/0001_init.sql"),
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:f1-crm.sqlite", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            desktop_status,
            create_backup,
            set_secondary_backup_dir,
            list_backups,
            restore_backup,
            delete_all_local_data,
            delete_backups,
            open_backup_dir,
            ensure_backup_task
        ])
        .setup(|app| {
            let root = app.path().app_config_dir()?;
            let db = root.join(DB_NAME);
            let backups = app.path().document_dir()?.join("F1 Immobiliare").join("Backup");
            let _ = fs::create_dir_all(&root);
            let _ = fs::create_dir_all(&backups);
            let _ = ensure_windows_task();
            maybe_missed_backup(&db, &backups, &root);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("errore durante l'avvio di F1 Immobiliare Desktop");
}
