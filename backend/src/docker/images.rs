use axum::{Json, response::IntoResponse, http::StatusCode, extract::Query};
use bollard::Docker;
use bollard::models::ContainerSummaryStateEnum;
use futures_util::future::join_all;
use serde::Deserialize;
use serde_json::json;
use std::collections::HashSet;

use super::{ServiceQuery, list_containers, get_service_name, error};

#[derive(Deserialize)]
pub struct ImageIdQuery {
    pub id: String,
}

pub async fn delete_image(Query(q): Query<ImageIdQuery>) -> impl IntoResponse {
    let docker = match Docker::connect_with_local_defaults() {
        Ok(d) => d,
        Err(e) => return error(e.to_string()),
    };

    let opts = bollard::query_parameters::RemoveImageOptions { force: true, noprune: false };
    match docker.remove_image(&q.id, Some(opts), None).await {
        Ok(_) => (StatusCode::OK, Json(json!({ "ok": true }))),
        Err(e) => error(e.to_string()),
    }
}

pub async fn service_images(Query(q): Query<ServiceQuery>) -> impl IntoResponse {
    let docker = match Docker::connect_with_local_defaults() {
        Ok(d) => d,
        Err(e) => return error(e.to_string()),
    };

    // All containers (including stopped) to find every image used by the service
    let all_containers = match list_containers(&docker, true).await {
        Ok(c) => c,
        Err(e) => return error(e.to_string()),
    };

    // Running containers to know which images are actively in use
    let running_images: HashSet<String> = all_containers
        .iter()
        .filter(|c| get_service_name(c) == q.name)
        .filter(|c| c.state == Some(ContainerSummaryStateEnum::RUNNING))
        .filter_map(|c| c.image.clone())
        .collect();

    let image_names: HashSet<String> = all_containers
        .iter()
        .filter(|c| get_service_name(c) == q.name)
        .filter_map(|c| c.image.clone())
        .collect();

    let tasks = image_names.into_iter().map(|image_name| {
        let docker = &docker;
        let in_use = running_images.contains(&image_name);
        async move { inspect_image(docker, &image_name, in_use).await }
    });

    let images: Vec<_> = join_all(tasks).await.into_iter().flatten().collect();

    (StatusCode::OK, Json(serde_json::Value::Array(images)))
}

async fn inspect_image(docker: &Docker, image_name: &str, in_use: bool) -> Option<serde_json::Value> {
    let inspect = docker.inspect_image(image_name).await.ok()?;

    let id = inspect.id.as_deref()
        .map(|id| {
            let id = id.strip_prefix("sha256:").unwrap_or(id);
            id[..id.len().min(12)].to_string()
        })
        .unwrap_or_default();

    let first_tag = inspect.repo_tags.as_ref().and_then(|tags| tags.first().cloned());

    let (name, tag) = first_tag.as_deref()
        .map(|full| {
            if let Some(pos) = full.rfind(':') {
                (full[..pos].to_string(), full[pos + 1..].to_string())
            } else {
                (full.to_string(), "latest".to_string())
            }
        })
        .unwrap_or_else(|| (image_name.to_string(), "latest".to_string()));

    // Use the repo tag for deletion if available, otherwise fall back to the full sha256 id
    let delete_id = first_tag.unwrap_or_else(|| {
        inspect.id.as_deref().unwrap_or(image_name).to_string()
    });

    Some(json!({
        "id": id,
        "delete_id": delete_id,
        "name": name,
        "tag": tag,
        "size": inspect.size.unwrap_or(0),
        "created": inspect.created.unwrap_or_default(),
        "architecture": inspect.architecture.unwrap_or_default(),
        "os": inspect.os.unwrap_or_default(),
        "in_use": in_use,
    }))
}
