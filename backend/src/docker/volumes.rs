use axum::{extract::{State, Query}, http::StatusCode, response::IntoResponse, Json};
use bollard::Docker;
use bollard::query_parameters::ListVolumesOptions;
use bollard::models::VolumeCreateRequest;
use serde::Deserialize;
use serde_json::json;
use sysinfo::Disks;
#[cfg(target_os = "macos")]
use std::path::Path;
use chrono::DateTime;

use crate::auth::AuthState;
use super::error;

/// Walk a directory recursively and sum the sizes of all files.
/// Returns -1 if the path doesn't exist or can't be read.
fn dir_size(path: &str) -> i64 {
    use std::fs;
    fn walk(p: &std::path::Path, acc: &mut u64) {
        let Ok(entries) = fs::read_dir(p) else { return };
        for entry in entries.flatten() {
            let path = entry.path();
            if let Ok(meta) = entry.metadata() {
                if meta.is_dir() {
                    walk(&path, acc);
                } else if meta.is_file() {
                    *acc += meta.len();
                }
            }
        }
    }
    let p = std::path::Path::new(path);
    if !p.exists() { return -1; }
    let mut total = 0u64;
    walk(p, &mut total);
    total as i64
}

#[derive(Deserialize)]
pub struct VolumeQuery {
    pub name: String,
}

#[derive(Deserialize)]
pub struct CreateVolumeRequest {
    pub name: String,
    pub driver: Option<String>,
}

pub async fn list_docker_volumes(State(_auth): State<AuthState>) -> impl IntoResponse {
    let docker = match Docker::connect_with_local_defaults() {
        Ok(d) => d,
        Err(e) => return error(e.to_string()),
    };

    let raw = match docker.list_volumes(None::<ListVolumesOptions>).await {
        Ok(v) => v.volumes.unwrap_or_default(),
        Err(e) => return error(e.to_string()),
    };

    let volumes: Vec<_> = raw.iter().map(|v| {
        // Prefer stack namespace label, then swarm service label, then name prefix
        let service = v.labels
            .get("com.docker.stack.namespace")
            .or_else(|| v.labels.get("com.docker.swarm.service.name"))
            .cloned()
            .unwrap_or_else(|| {
                // Heuristic: "stack_volume" → "stack"
                let name = &v.name;
                if name.contains('_') {
                    name.splitn(2, '_').next().unwrap_or("").to_string()
                } else {
                    String::new()
                }
            });

        let (mut size, ref_count) = v.usage_data.as_ref()
            .map(|u| (u.size, u.ref_count))
            .unwrap_or((-1, -1));

        // Docker Desktop (Mac) fills usage_data; native Linux doesn't.
        // Fall back to walking the mountpoint directory.
        if size < 0 {
            size = dir_size(&v.mountpoint);
        }

        let created = v.created_at.as_deref()
            .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
            .map(|d| d.timestamp())
            .unwrap_or(0);

        json!({
            "name":        v.name,
            "driver":      v.driver,
            "mountpoint":  v.mountpoint,
            "created_at":  created,
            "service":     service,
            "size":        size,
            "ref_count":   ref_count,
            "labels":      v.labels,
        })
    }).collect();

    // System disk info — same logic as system/metrics/disk.rs
    let disks = Disks::new_with_refreshed_list();
    let mut seen_devices = std::collections::HashSet::<String>::new();
    let mut disk_total = 0u64;
    let mut disk_available = 0u64;
    for d in disks.list() {
        let fs = d.file_system().to_string_lossy().to_lowercase();
        if matches!(
            fs.as_str(),
            "devfs" | "autofs" | "tmpfs" | "devtmpfs" | "sysfs" | "proc" | "procfs"
                | "squashfs" | "overlay" | "cgroup" | "cgroup2" | "pstore" | "debugfs"
                | "securityfs" | "configfs" | "fusectl" | "hugetlbfs" | "mqueue" | "bpf"
        ) {
            continue;
        }
        #[cfg(target_os = "macos")]
        {
            let mp = d.mount_point();
            if mp != Path::new("/") && !mp.starts_with(Path::new("/Volumes/")) {
                continue;
            }
        }
        let name = d.name().to_string_lossy().to_string();
        if seen_devices.insert(name) {
            disk_total = disk_total.saturating_add(d.total_space());
            disk_available = disk_available.saturating_add(d.available_space());
        }
    }

    let disk_used = disk_total.saturating_sub(disk_available);
    let volumes_known_size: i64 = volumes.iter()
        .filter_map(|v| v["size"].as_i64().filter(|&s| s >= 0))
        .sum();

    (StatusCode::OK, Json(json!({
        "volumes": volumes,
        "disk": {
            "total":   disk_total,
            "used":    disk_used,
            "free":    disk_available,
        },
        "volumes_total_size": volumes_known_size,
    })))
}

pub async fn create_volume(Json(body): Json<CreateVolumeRequest>) -> impl IntoResponse {
    let docker = match Docker::connect_with_local_defaults() {
        Ok(d) => d,
        Err(e) => return error(e.to_string()),
    };

    let config = VolumeCreateRequest {
        name: Some(body.name),
        driver: Some(body.driver.unwrap_or_else(|| "local".into())),
        ..Default::default()
    };

    match docker.create_volume(config).await {
        Ok(v) => (StatusCode::OK, Json(json!({ "name": v.name }))),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": e.to_string() }))),
    }
}

pub async fn delete_volume(Query(q): Query<VolumeQuery>) -> impl IntoResponse {
    let docker = match Docker::connect_with_local_defaults() {
        Ok(d) => d,
        Err(e) => return error(e.to_string()),
    };

    match docker.remove_volume(&q.name, None::<bollard::query_parameters::RemoveVolumeOptions>).await {
        Ok(_) => (StatusCode::OK, Json(json!({ "ok": true }))),
        Err(e) => error(e.to_string()),
    }
}
