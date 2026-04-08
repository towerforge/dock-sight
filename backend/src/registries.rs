use axum::{extract::{Query, State}, http::StatusCode, response::IntoResponse, Json};
use serde::Deserialize;
use serde_json::json;

use crate::auth::{AuthState, Registry};

pub async fn list_registries(
    State(auth): State<AuthState>,
) -> impl IntoResponse {
    let config = auth.config.lock().await;
    let list: Vec<_> = config.registries.iter().map(|r| json!({
        "id":         r.id,
        "name":       r.name,
        "provider":   r.provider,
        "username":   r.username,
        "token_hint": if r.token.len() > 4 {
            format!("{}••••", &r.token[..4])
        } else {
            "••••".into()
        },
    })).collect();
    (StatusCode::OK, Json(json!(list)))
}

#[derive(Deserialize)]
pub struct CreateRegistryRequest {
    pub name:     String,
    pub provider: String,
    pub username: String,
    pub token:    String,
}

pub async fn create_registry(
    State(auth): State<AuthState>,
    Json(body): Json<CreateRegistryRequest>,
) -> impl IntoResponse {
    if body.name.is_empty() || body.username.is_empty() || body.token.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({ "error": "name, username and token are required" })));
    }

    let id = uuid::Uuid::new_v4().to_string();
    let registry = Registry {
        id: id.clone(),
        name: body.name,
        provider: body.provider,
        username: body.username,
        token: body.token,
    };

    auth.config.lock().await.registries.push(registry);
    auth.save_config().await;

    (StatusCode::OK, Json(json!({ "id": id })))
}

#[derive(Deserialize)]
pub struct RegistryQuery {
    pub id: String,
}

pub async fn delete_registry(
    State(auth): State<AuthState>,
    Query(q): Query<RegistryQuery>,
) -> impl IntoResponse {
    let mut config = auth.config.lock().await;
    let before = config.registries.len();
    config.registries.retain(|r| r.id != q.id);

    if config.registries.len() == before {
        return (StatusCode::NOT_FOUND, Json(json!({ "error": "registry not found" })));
    }

    drop(config);
    auth.save_config().await;
    (StatusCode::OK, Json(json!({ "ok": true })))
}
