use axum::{Json, response::IntoResponse, http::StatusCode};
use bollard::Docker;
use bollard::models::ContainerSummaryStateEnum;
use bollard::query_parameters::PruneImagesOptionsBuilder;
use serde_json::json;
use std::collections::{HashMap, HashSet};

use super::{list_containers, error};

pub async fn cleanup_preview() -> impl IntoResponse {
    let docker = match Docker::connect_with_local_defaults() {
        Ok(d) => d,
        Err(e) => return error(e.to_string()),
    };

    let all_containers = match list_containers(&docker, true).await {
        Ok(c) => c,
        Err(e) => return error(e.to_string()),
    };

    // Stopped containers
    let stopped: Vec<_> = all_containers.iter()
        .filter(|c| c.state != Some(ContainerSummaryStateEnum::RUNNING))
        .map(|c| {
            let id = c.id.as_deref().unwrap_or("");
            let short_id = &id[..id.len().min(12)];
            let name = c.names.as_ref()
                .and_then(|n| n.first())
                .map(|n| n.trim_start_matches('/').to_string())
                .unwrap_or_default();
            json!({
                "id": short_id,
                "name": name,
                "image": c.image.as_deref().unwrap_or(""),
                "status": c.status.as_deref().unwrap_or(""),
            })
        })
        .collect();

    // Images referenced by any container (running or stopped) — strip digest hash for matching.
    // Stopped containers still hold a reference; Docker won't remove those images until the
    // container is deleted first, so we exclude them from the "unused" list too.
    let used_by_any: HashSet<String> = all_containers.iter()
        .filter_map(|c| {
            let img = c.image.as_ref()?;
            Some(img.split('@').next().unwrap_or(img).to_string())
        })
        .collect();

    let all_images = match docker.list_images(None::<bollard::query_parameters::ListImagesOptions>).await {
        Ok(i) => i,
        Err(e) => return error(e.to_string()),
    };

    let unused: Vec<_> = all_images.iter()
        .filter(|img| !img.repo_tags.iter().any(|tag| used_by_any.contains(tag)))
        .collect();

    let total_space: i64 = unused.iter().map(|img| img.size).sum();

    let unused_images: Vec<_> = unused.iter().map(|img| {
        let id = img.id.strip_prefix("sha256:").unwrap_or(&img.id);
        let short_id = &id[..id.len().min(12)];
        let tag = img.repo_tags.first()
            .cloned()
            .unwrap_or_else(|| "<none>".to_string());
        json!({
            "id": short_id,
            "tag": tag,
            "size": img.size,
        })
    }).collect();

    (StatusCode::OK, Json(json!({
        "containers": stopped,
        "images": unused_images,
        "total_space": total_space,
    })))
}

pub async fn run_cleanup() -> impl IntoResponse {
    let docker = match Docker::connect_with_local_defaults() {
        Ok(d) => d,
        Err(e) => return error(e.to_string()),
    };

    // 1. Prune all stopped containers
    let containers_result = docker
        .prune_containers(None::<bollard::query_parameters::PruneContainersOptions>)
        .await;
    let containers_deleted = containers_result.as_ref().ok()
        .and_then(|r| r.containers_deleted.as_ref())
        .map(|v| v.len())
        .unwrap_or(0);
    let containers_space = containers_result.as_ref().ok()
        .and_then(|r| r.space_reclaimed)
        .unwrap_or(0);

    // 2. Prune all unused images (dangling=false → equivalent to docker image prune -a)
    let mut filters: HashMap<String, Vec<String>> = HashMap::new();
    filters.insert("dangling".to_string(), vec!["false".to_string()]);
    let images_result = docker
        .prune_images(Some(
            PruneImagesOptionsBuilder::default()
                .filters(&filters)
                .build(),
        ))
        .await;
    let images_deleted = images_result.as_ref().ok()
        .and_then(|r| r.images_deleted.as_ref())
        .map(|v| v.len())
        .unwrap_or(0);
    let images_space = images_result.as_ref().ok()
        .and_then(|r| r.space_reclaimed)
        .unwrap_or(0);

    (StatusCode::OK, Json(json!({
        "containers_deleted": containers_deleted,
        "images_deleted": images_deleted,
        "space_reclaimed": containers_space + images_space,
    })))
}
