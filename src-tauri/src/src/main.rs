// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod cert;
mod db;
mod intruder;
mod proxy;
mod repeater;
mod target;

use std::sync::Arc;
use parking_lot::RwLock;
use tauri::Emitter;
use tokio::sync::{mpsc, RwLock as TokioRwLock};
use tokio_util::sync::CancellationToken;

pub use cert::CertManager;
pub use db::{Call, Database, Finding};
pub use intruder::{AttackConfig, AttackProgress, AttackResult, IntruderEngine, PayloadConfig, PayloadPosition, PayloadType};
pub use proxy::{ApiCall, ProxyConnection, ProxyServer, ProxyState};
pub use repeater::{HttpRequest, HttpResponse, Repeater};
pub use target::{Target, TargetManager};

pub struct AppState {
    pub proxy: Arc<RwLock<ProxyState>>,
    pub db: Arc<Database>,
    pub targets: RwLock<TargetManager>,
    pub cert_manager: Arc<CertManager>,
    pub repeater: Arc<Repeater>,
    pub intruder_engine: Arc<IntruderEngine>,
    pub active_attacks: Arc<TokioRwLock<std::collections::HashMap<String, bool>>>,
    pub cancel_token: CancellationToken,
}

impl Default for AppState {
    fn default() -> Self {
        let db = Arc::new(Database::new());
        Self {
            proxy: Arc::new(RwLock::new(ProxyState::default())),
            db: db.clone(),
            targets: RwLock::new(TargetManager::new(db)),
            cert_manager: Arc::new(CertManager::new()),
            repeater: Arc::new(Repeater::new()),
            intruder_engine: Arc::new(IntruderEngine::new()),
            active_attacks: Arc::new(TokioRwLock::new(std::collections::HashMap::new())),
            cancel_token: CancellationToken::new(),
        }
    }
}

#[tauri::command]
async fn start_proxy(
    app: tauri::AppHandle,
    port: u16,
    target_id: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    log::info!("Starting proxy server on port {} with target_id {:?}", port, target_id);

    let mut proxy_state = state.proxy.write();
    if proxy_state.running {
        return Ok("Proxy already running".to_string());
    }

    let mut proxy = ProxyServer::new(port, state.cert_manager.clone());
    if let Some(tid) = &target_id {
        proxy = proxy.with_target_id(tid.clone());
    }
    proxy_state.running = true;
    proxy_state.port = Some(port);

    let app_handle = app.clone();
    let cancel_token = state.cancel_token.clone();
    tokio::spawn(async move {
        if let Err(e) = proxy.start(app_handle, cancel_token).await {
            log::error!("Proxy server error: {}", e);
        }
    });

    Ok(format!("Proxy started on port {}", port))
}

#[tauri::command]
async fn stop_proxy(state: tauri::State<'_, AppState>) -> Result<String, String> {
    log::info!("Stopping proxy server");
    state.cancel_token.cancel();
    let mut proxy_state = state.proxy.write();
    proxy_state.running = false;
    proxy_state.port = None;
    Ok("Proxy stopped".to_string())
}

#[tauri::command]
fn get_proxy_status(state: tauri::State<'_, AppState>) -> Result<ProxyState, String> {
    let proxy_state = state.proxy.read();
    Ok(proxy_state.clone())
}

#[tauri::command]
fn get_targets(state: tauri::State<'_, AppState>) -> Result<Vec<Target>, String> {
    let targets = state.targets.read();
    Ok(targets.get_all())
}

#[tauri::command]
fn create_target(
    name: String,
    scope: Vec<String>,
    state: tauri::State<'_, AppState>,
) -> Result<Target, String> {
    let mut targets = state.targets.write();
    targets.create_target(name, scope)
}

#[tauri::command]
fn delete_target(id: String, state: tauri::State<'_, AppState>) -> Result<bool, String> {
    let mut targets = state.targets.write();
    Ok(targets.delete_target(&id))
}

#[tauri::command]
fn add_target_scope(
    id: String,
    scope: Vec<String>,
    state: tauri::State<'_, AppState>,
) -> Result<Target, String> {
    let mut targets = state.targets.write();
    targets
        .add_to_scope(&id, scope)
        .ok_or_else(|| "Target not found".to_string())
}

#[tauri::command]
fn remove_target_scope(
    id: String,
    scope: Vec<String>,
    state: tauri::State<'_, AppState>,
) -> Result<Target, String> {
    let mut targets = state.targets.write();
    targets
        .remove_from_scope(&id, scope)
        .ok_or_else(|| "Target not found".to_string())
}

#[tauri::command]
fn get_calls(target_id: String, state: tauri::State<'_, AppState>) -> Result<Vec<Call>, String> {
    Ok(state.db.load_calls(&target_id))
}

#[tauri::command]
fn get_ca_cert(state: tauri::State<'_, AppState>) -> Result<String, String> {
    state.cert_manager.get_ca_cert_pem()
}

#[tauri::command]
fn generate_ca_cert(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let (cert, _) = state.cert_manager.generate_ca_cert()?;
    Ok(cert)
}

#[tauri::command]
async fn send_http_request(
    request: HttpRequest,
    state: tauri::State<'_, AppState>,
) -> Result<HttpResponse, String> {
    log::info!("Sending HTTP request: {} {}", request.method, request.url);
    state.repeater.send_request(&request).await
}

#[tauri::command]
async fn start_intruder_attack(
    config: AttackConfig,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let attack_id = format!("attack_{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos());

    log::info!("Starting intruder attack: {} with mode {:?}", attack_id, config.mode);

    {
        let mut attacks = state.active_attacks.write().await;
        attacks.insert(attack_id.clone(), true);
    }

    let engine = state.intruder_engine.clone();
    let active_attacks = state.active_attacks.clone();
    let attack_id_clone = attack_id.clone();

    tokio::spawn(async move {
        let (progress_tx, mut progress_rx) = mpsc::channel::<AttackProgress>(100);
        let (results_tx, mut results_rx) = mpsc::channel::<AttackResult>(100);

        let app_handle = app.clone();
        let attack_id_inner = attack_id_clone.clone();

        tokio::spawn(async move {
            while let Some(progress) = progress_rx.recv().await {
                let _ = app_handle.emit(&format!("intruder-progress-{}", attack_id_inner), &progress);
            }
        });

        let config_clone = config.clone();
        tokio::spawn(async move {
            if let Err(e) = engine.run_attack(&config_clone, progress_tx, results_tx).await {
                log::error!("Attack failed: {}", e);
            }
        });

        while let Some(result) = results_rx.recv().await {
            let _ = app.emit(&format!("intruder-result-{}", attack_id_clone), &result);
        }

        let mut attacks = active_attacks.write().await;
        attacks.remove(&attack_id_clone);
    });

    Ok(attack_id)
}

#[tauri::command]
async fn stop_intruder_attack(
    attack_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    log::info!("Stopping intruder attack: {}", attack_id);
    let mut attacks = state.active_attacks.write().await;
    attacks.remove(&attack_id);
    Ok(())
}

#[tauri::command]
async fn get_intruder_attack_status(
    attack_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<bool, String> {
    let attacks = state.active_attacks.read().await;
    Ok(attacks.contains_key(&attack_id))
}

#[tauri::command]
fn get_findings(
    target_id: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Finding>, String> {
    log::info!("Loading findings for target_id: {:?}", target_id);
    Ok(state.db.load_findings(target_id.as_deref()))
}

#[tauri::command]
fn create_finding(
    finding: Finding,
    state: tauri::State<'_, AppState>,
) -> Result<Finding, String> {
    log::info!("Creating finding: {}", finding.title);
    state.db.save_finding(&finding)?;
    Ok(finding)
}

#[tauri::command]
fn update_finding(
    finding: Finding,
    state: tauri::State<'_, AppState>,
) -> Result<Finding, String> {
    log::info!("Updating finding: {}", finding.id);
    state.db.save_finding(&finding)?;
    Ok(finding)
}

#[tauri::command]
fn delete_finding(
    id: String,
    state: tauri::State<'_, AppState>,
) -> Result<bool, String> {
    log::info!("Deleting finding: {}", id);
    state.db.delete_finding(&id)
}

fn main() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .format_timestamp_millis()
        .init();

    log::info!("Starting Bug Bounty Tools...");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            start_proxy,
            stop_proxy,
            get_proxy_status,
            get_targets,
            create_target,
            delete_target,
            add_target_scope,
            remove_target_scope,
            get_calls,
            get_ca_cert,
            generate_ca_cert,
            send_http_request,
            start_intruder_attack,
            stop_intruder_attack,
            get_intruder_attack_status,
            get_findings,
            create_finding,
            update_finding,
            delete_finding
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}