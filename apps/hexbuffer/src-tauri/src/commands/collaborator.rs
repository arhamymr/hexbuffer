use tauri::State;
use uuid::Uuid;

use crate::collaborator::{
    CollaboratorDashboardStats, CollaboratorInteraction, CollaboratorPayload, CollaboratorServer,
    CreatePayloadRequest, CreateServerRequest, ServerInteraction, ServerPayloadCreated,
};
use crate::history::HistoryBridge;

#[tauri::command]
pub async fn list_collaborator_servers(
    history: State<'_, HistoryBridge>,
) -> Result<Vec<CollaboratorServer>, String> {
    history.list_collaborator_servers()
}

#[tauri::command]
pub async fn add_collaborator_server(
    history: State<'_, HistoryBridge>,
    server: CreateServerRequest,
) -> Result<CollaboratorServer, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let new_server = CollaboratorServer {
        id: Uuid::new_v4().to_string(),
        name: server.name,
        url: server.url.trim_end_matches('/').to_string(),
        api_key: server.api_key,
        status: "connected".to_string(),
        created_at: now.clone(),
        updated_at: now,
    };

    history.insert_collaborator_server(&new_server)?;
    Ok(new_server)
}

#[tauri::command]
pub async fn update_collaborator_server(
    history: State<'_, HistoryBridge>,
    server: CollaboratorServer,
) -> Result<CollaboratorServer, String> {
    let updated = CollaboratorServer {
        updated_at: chrono::Utc::now().to_rfc3339(),
        ..server
    };
    history.update_collaborator_server(&updated)?;
    Ok(updated)
}

#[tauri::command]
pub async fn delete_collaborator_server(
    history: State<'_, HistoryBridge>,
    id: String,
) -> Result<(), String> {
    history.delete_collaborator_server(&id)
}

#[tauri::command]
pub async fn check_collaborator_server_health(
    history: State<'_, HistoryBridge>,
    id: String,
) -> Result<CollaboratorServer, String> {
    let server = history
        .get_collaborator_server(&id)?
        .ok_or_else(|| "Server not found".to_string())?;

    let is_healthy = check_server_health(&server.url, &server.api_key).await;
    let new_status = if is_healthy { "connected" } else { "offline" };

    let updated = CollaboratorServer {
        status: new_status.to_string(),
        updated_at: chrono::Utc::now().to_rfc3339(),
        ..server
    };
    history.update_collaborator_server(&updated)?;
    Ok(updated)
}

async fn check_server_health(base_url: &str, api_key: &str) -> bool {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .unwrap_or_default();

    let url = format!("{}/api/health", base_url);
    match client.get(&url).header("X-API-Key", api_key).send().await {
        Ok(resp) => resp.status().is_success(),
        Err(_) => false,
    }
}

#[tauri::command]
pub async fn create_collaborator_payload(
    history: State<'_, HistoryBridge>,
    request: CreatePayloadRequest,
) -> Result<CollaboratorPayload, String> {
    let server = history
        .get_collaborator_server(&request.server_id)?
        .ok_or_else(|| "Server not found".to_string())?;

    let identifier = generate_payload_identifier();
    let payload_url = format!("{}.{}", identifier, extract_domain(&server.url));

    let server_result =
        create_payload_on_server(&server.url, &server.api_key, &identifier, &request.name).await;

    let (final_identifier, final_payload_url) = match server_result {
        Ok(created) => (created.identifier, created.payload_url),
        Err(_) => (identifier, payload_url),
    };

    let now = chrono::Utc::now().to_rfc3339();
    let tags_json = serde_json::to_string(&request.tags).unwrap_or_else(|_| "[]".to_string());

    let payload = CollaboratorPayload {
        id: Uuid::new_v4().to_string(),
        server_id: request.server_id,
        identifier: final_identifier,
        payload_url: final_payload_url,
        name: request.name,
        description: request.description,
        tags: tags_json,
        interaction_count: 0,
        status: "active".to_string(),
        created_at: now,
        last_seen_at: None,
    };

    history.insert_collaborator_payload(&payload)?;
    Ok(payload)
}

async fn create_payload_on_server(
    base_url: &str,
    api_key: &str,
    identifier: &str,
    name: &str,
) -> Result<ServerPayloadCreated, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("{}/api/payloads", base_url);
    let body = serde_json::json!({
        "identifier": identifier,
        "name": name,
    });

    let resp = client
        .post(&url)
        .header("X-API-Key", api_key)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to create payload on server: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Server returned error: {}", resp.status()));
    }

    resp.json::<ServerPayloadCreated>()
        .await
        .map_err(|e| format!("Failed to parse server response: {}", e))
}

#[tauri::command]
pub async fn list_collaborator_payloads(
    history: State<'_, HistoryBridge>,
    server_id: Option<String>,
) -> Result<Vec<CollaboratorPayload>, String> {
    history.list_collaborator_payloads(server_id.as_deref())
}

#[tauri::command]
pub async fn delete_collaborator_payload(
    history: State<'_, HistoryBridge>,
    id: String,
) -> Result<(), String> {
    history.delete_collaborator_payload(&id)
}

#[tauri::command]
pub async fn archive_collaborator_payload(
    history: State<'_, HistoryBridge>,
    id: String,
) -> Result<(), String> {
    history.update_collaborator_payload_status(&id, "archived")
}

#[tauri::command]
pub async fn list_collaborator_interactions(
    history: State<'_, HistoryBridge>,
    payload_id: Option<String>,
    interaction_type: Option<String>,
) -> Result<Vec<CollaboratorInteraction>, String> {
    history.list_collaborator_interactions(payload_id.as_deref(), interaction_type.as_deref())
}

#[tauri::command]
pub async fn get_collaborator_interaction(
    history: State<'_, HistoryBridge>,
    id: String,
) -> Result<Option<CollaboratorInteraction>, String> {
    history.get_collaborator_interaction(&id)
}

#[tauri::command]
pub async fn poll_collaborator_interactions(
    history: State<'_, HistoryBridge>,
    server_id: String,
) -> Result<Vec<CollaboratorInteraction>, String> {
    let server = history
        .get_collaborator_server(&server_id)?
        .ok_or_else(|| "Server not found".to_string())?;

    let payloads = history.list_collaborator_payloads(Some(&server_id))?;
    let mut all_new_interactions: Vec<CollaboratorInteraction> = Vec::new();

    for payload in &payloads {
        if payload.status != "active" {
            continue;
        }

        let interactions =
            fetch_interactions_from_server(&server.url, &server.api_key, &payload.identifier)
                .await
                .unwrap_or_default();

        let new_count = interactions.len() as i64;

        for server_interaction in interactions {
            let interaction = CollaboratorInteraction {
                id: server_interaction.id,
                payload_id: payload.id.clone(),
                interaction_type: server_interaction.interaction_type,
                source_ip: server_interaction.source_ip,
                method: server_interaction.method,
                path: server_interaction.path,
                headers: server_interaction.headers,
                raw_request: server_interaction.raw_request,
                request_body: server_interaction.request_body,
                server_response: server_interaction.server_response,
                timestamp: server_interaction.timestamp,
            };

            if history
                .insert_collaborator_interaction(&interaction)
                .is_ok()
            {
                all_new_interactions.push(interaction);
            }
        }

        if new_count > 0 {
            let _ = history.increment_collaborator_payload_interactions(&payload.id, new_count);
        }
    }

    Ok(all_new_interactions)
}

async fn fetch_interactions_from_server(
    base_url: &str,
    api_key: &str,
    identifier: &str,
) -> Result<Vec<ServerInteraction>, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("{}/api/interactions?identifier={}", base_url, identifier);
    let resp = client
        .get(&url)
        .header("X-API-Key", api_key)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch interactions: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Server returned error: {}", resp.status()));
    }

    resp.json::<Vec<ServerInteraction>>()
        .await
        .map_err(|e| format!("Failed to parse interactions: {}", e))
}

#[tauri::command]
pub async fn get_collaborator_dashboard_stats(
    history: State<'_, HistoryBridge>,
) -> Result<CollaboratorDashboardStats, String> {
    history.get_collaborator_dashboard_stats()
}

fn generate_payload_identifier() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    (0..6)
        .map(|_| {
            let idx = rng.gen_range(0..36);
            if idx < 10 {
                (b'0' + idx) as char
            } else {
                (b'a' + idx - 10) as char
            }
        })
        .collect()
}

fn extract_domain(url: &str) -> String {
    url::Url::parse(url)
        .ok()
        .and_then(|u| u.host_str().map(|h| h.to_string()))
        .unwrap_or_else(|| "collab.example.com".to_string())
}
