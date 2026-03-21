use axum::{Json, response::IntoResponse, http::StatusCode, extract::Query};
use bollard::Docker;
use futures_util::future::join_all;
use serde_json::json;
use std::collections::HashSet;

use super::{ServiceQuery, list_containers, get_service_name, error};

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

    let id = inspect.id.as_deref()
        .map(|id| {
            let id = id.strip_prefix("sha256:").unwrap_or(id);
            id[..id.len().min(12)].to_string()
        })
        .unwrap_or_default();

    let (name, tag) = inspect.repo_tags.as_ref()
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
