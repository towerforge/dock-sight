use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use bollard::Docker;
use bollard::query_parameters::ListVolumesOptions;
use serde_json::json;
use sysinfo::Disks;
use std::path::Path;
use chrono::DateTime;

use crate::auth::AuthState;
use super::error;

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

        let (size, ref_count) = v.usage_data.as_ref()
            .map(|u| (u.size, u.ref_count))
            .unwrap_or((-1, -1));

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

    // System disk info (reuse same logic as sysinfo)
    let disks = Disks::new_with_refreshed_list();
    let (disk_total, disk_available) = disks.list().iter()
        .filter(|d| {
            let fs = d.file_system().to_string_lossy().to_lowercase();
            if matches!(fs.as_str(), "devfs"|"autofs"|"tmpfs"|"devtmpfs"|"sysfs"|"proc"|"procfs"|"overlay") {
                return false;
            }
            #[cfg(target_os = "macos")]
            {
                let mp = d.mount_point();
                return mp == Path::new("/") || mp.starts_with(Path::new("/Volumes/"));
            }
            #[cfg(not(target_os = "macos"))]
            true
        })
        .fold((0u64, 0u64), |(t, a), d| (t + d.total_space(), a + d.available_space()));

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
