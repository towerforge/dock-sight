use axum::{Json, response::IntoResponse, http::StatusCode, extract::Query};
use bollard::Docker;
use bollard::query_parameters::ListContainersOptions;
use bollard::models::ContainerSummary;
use futures_util::future::join_all;
use serde::Deserialize;
use serde_json::json;
use std::collections::HashSet;

#[derive(Deserialize)]
pub struct ServiceQuery {
    pub name: String,
}

// ── GET /docker-service/info?name=<service> ───────────────────────────────────

pub async fn service_info(Query(q): Query<ServiceQuery>) -> impl IntoResponse {
    let docker = match Docker::connect_with_local_defaults() {
        Ok(d) => d,
        Err(e) => return error(e.to_string()),
    };

    let containers = match list_containers(&docker).await {
        Ok(c) => c,
        Err(e) => return error(e.to_string()),
    };

    let service_containers: Vec<_> = containers
        .iter()
        .filter(|c| get_service_name(c) == q.name)
        .collect();

    let tasks = service_containers
        .iter()
        .map(|c| inspect_container_info(&docker, c));

    let results: Vec<_> = join_all(tasks).await.into_iter().flatten().collect();

    (StatusCode::OK, Json(json!({ "name": q.name, "containers": results })))
}

async fn inspect_container_info(docker: &Docker, c: &ContainerSummary) -> Option<serde_json::Value> {
    let id = c.id.as_deref()?;
    let inspect = docker.inspect_container(id, None).await.ok()?;

    let short_id = &id[..id.len().min(12)];

    let name = inspect
        .name
        .as_deref()
        .map(|n| n.trim_start_matches('/').to_string())
        .unwrap_or_default();

    let status = inspect
        .state
        .as_ref()
        .and_then(|s| s.status.as_ref())
        .map(|s| s.to_string())
        .unwrap_or_default();

    let running = inspect
        .state
        .as_ref()
        .and_then(|s| s.running)
        .unwrap_or(false);

    let started_at = inspect
        .state
        .as_ref()
        .and_then(|s| s.started_at.clone())
        .unwrap_or_default();

    let created = inspect.created.clone().unwrap_or_default();

    let image = inspect
        .config
        .as_ref()
        .and_then(|cfg| cfg.image.clone())
        .unwrap_or_default();

    let command = {
        let path = inspect.path.clone().unwrap_or_default();
        let args = inspect
            .args
            .as_deref()
            .unwrap_or(&[])
            .join(" ");
        if args.is_empty() { path } else { format!("{} {}", path, args) }
    };

    let restart_policy = inspect
        .host_config
        .as_ref()
        .and_then(|hc| hc.restart_policy.as_ref())
        .and_then(|rp| rp.name.as_ref())
        .map(|n| n.to_string())
        .unwrap_or_default();

    let ports: Vec<String> = inspect
        .network_settings
        .as_ref()
        .and_then(|ns| ns.ports.as_ref())
        .map(|ports| {
            ports
                .iter()
                .filter_map(|(container_port, bindings)| {
                    bindings.as_ref().and_then(|b| b.first()).map(|binding| {
                        let host_port = binding.host_port.as_deref().unwrap_or("?");
                        format!("{}→{}", host_port, container_port)
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    let networks: Vec<String> = inspect
        .network_settings
        .as_ref()
        .and_then(|ns| ns.networks.as_ref())
        .map(|nets| nets.keys().cloned().collect())
        .unwrap_or_default();

    let mounts: Vec<serde_json::Value> = inspect
        .mounts
        .as_ref()
        .map(|mounts| {
            mounts
                .iter()
                .map(|m| json!({
                    "source": m.source.as_deref().unwrap_or(""),
                    "destination": m.destination.as_deref().unwrap_or(""),
                    "type": m.typ.as_ref().map(|t| t.to_string()).unwrap_or_default(),
                }))
                .collect()
        })
        .unwrap_or_default();

    Some(json!({
        "id": short_id,
        "name": name,
        "status": status,
        "running": running,
        "created": created,
        "started_at": started_at,
        "image": image,
        "command": command,
        "restart_policy": restart_policy,
        "ports": ports,
        "networks": networks,
        "mounts": mounts,
    }))
}

// ── GET /docker-service/images?name=<service> ────────────────────────────────

pub async fn service_images(Query(q): Query<ServiceQuery>) -> impl IntoResponse {
    let docker = match Docker::connect_with_local_defaults() {
        Ok(d) => d,
        Err(e) => return error(e.to_string()),
    };

    let containers = match list_containers(&docker).await {
        Ok(c) => c,
        Err(e) => return error(e.to_string()),
    };

    let image_names: HashSet<String> = containers
        .iter()
        .filter(|c| get_service_name(c) == q.name)
        .filter_map(|c| c.image.clone())
        .collect();

    let tasks = image_names.into_iter().map(|image_name| {
        let docker = &docker;
        async move { inspect_image(docker, &image_name).await }
    });

    let images: Vec<_> = join_all(tasks).await.into_iter().flatten().collect();

    (StatusCode::OK, Json(serde_json::Value::Array(images)))
}

async fn inspect_image(docker: &Docker, image_name: &str) -> Option<serde_json::Value> {
    let inspect = docker.inspect_image(image_name).await.ok()?;

    let id = inspect
        .id
        .as_deref()
        .map(|id| {
            let id = id.strip_prefix("sha256:").unwrap_or(id);
            id[..id.len().min(12)].to_string()
        })
        .unwrap_or_default();

    let (name, tag) = inspect
        .repo_tags
        .as_ref()
        .and_then(|tags| tags.first())
        .map(|full| {
            if let Some(pos) = full.rfind(':') {
                (full[..pos].to_string(), full[pos + 1..].to_string())
            } else {
                (full.clone(), "latest".to_string())
            }
        })
        .unwrap_or_else(|| (image_name.to_string(), "latest".to_string()));

    Some(json!({
        "id": id,
        "name": name,
        "tag": tag,
        "size": inspect.size.unwrap_or(0),
        "created": inspect.created.unwrap_or_default(),
        "architecture": inspect.architecture.unwrap_or_default(),
        "os": inspect.os.unwrap_or_default(),
    }))
}

// ── Shared helpers ────────────────────────────────────────────────────────────

async fn list_containers(docker: &Docker) -> Result<Vec<ContainerSummary>, bollard::errors::Error> {
    docker
        .list_containers(Some(ListContainersOptions { all: false, ..Default::default() }))
        .await
}

fn get_service_name(c: &ContainerSummary) -> String {
    c.labels
        .as_ref()
        .and_then(|l| l.get("com.docker.swarm.service.name"))
        .cloned()
        .unwrap_or_else(|| "standalone".into())
}

fn error(msg: String) -> (StatusCode, Json<serde_json::Value>) {
    (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": msg })))
}
