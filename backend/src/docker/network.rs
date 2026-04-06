use axum::{Json, response::IntoResponse, http::StatusCode};
use bollard::Docker;
use bollard::models::NetworkCreateRequest;
use serde::Deserialize;
use serde_json::json;

use super::error;

#[derive(Deserialize)]
pub struct CreateNetworkRequest {
    pub name: String,
    pub driver: Option<String>,
}

pub async fn list_networks() -> impl IntoResponse {
    let docker = match Docker::connect_with_local_defaults() {
        Ok(d) => d,
        Err(e) => return error(e.to_string()),
    };

    match docker.list_networks(None::<bollard::query_parameters::ListNetworksOptions>).await {
        Ok(networks) => {
            let list: Vec<_> = networks.into_iter().map(|n| json!({
                "id":     n.id.unwrap_or_default(),
                "name":   n.name.unwrap_or_default(),
                "driver": n.driver.unwrap_or_default(),
                "scope":  n.scope.unwrap_or_default(),
            })).collect();
            (StatusCode::OK, Json(json!(list)))
        }
        Err(e) => error(e.to_string()),
    }
}

pub async fn create_network(Json(body): Json<CreateNetworkRequest>) -> impl IntoResponse {
    let docker = match Docker::connect_with_local_defaults() {
        Ok(d) => d,
        Err(e) => return error(e.to_string()),
    };

    let config = NetworkCreateRequest {
        name: body.name,
        driver: Some(body.driver.unwrap_or_else(|| "overlay".into())),
        ..Default::default()
    };

    match docker.create_network(config).await {
        Ok(response) => (StatusCode::OK, Json(json!({ "id": response.id }))),
        Err(e) => error(e.to_string()),
    }
}
