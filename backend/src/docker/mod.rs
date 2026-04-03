pub mod services;
pub mod containers;
pub mod images;
pub mod logs;
pub mod cleanup;
pub mod deploy;

pub use services::services;
pub use containers::{service_containers, delete_container};
pub use images::{service_images, delete_image};
pub use logs::service_logs;
pub use cleanup::{cleanup_preview, run_cleanup};
pub use deploy::create_service;

// ── Shared helpers ────────────────────────────────────────────────────────────

use axum::{Json, http::StatusCode};
use bollard::Docker;
use bollard::models::ContainerSummary;
use bollard::query_parameters::ListContainersOptions;
use serde::Deserialize;
use serde_json::json;

#[derive(Deserialize)]
pub struct ServiceQuery {
    pub name: String,
}

pub(crate) async fn list_containers(docker: &Docker, all: bool) -> Result<Vec<ContainerSummary>, bollard::errors::Error> {
    docker.list_containers(Some(ListContainersOptions { all, ..Default::default() })).await
}

pub(crate) fn get_service_name(c: &ContainerSummary) -> String {
    c.labels
        .as_ref()
        .and_then(|l| l.get("com.docker.swarm.service.name"))
        .cloned()
        .unwrap_or_else(|| "standalone".into())
}

pub(crate) fn error(msg: String) -> (StatusCode, Json<serde_json::Value>) {
    (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": msg })))
}
