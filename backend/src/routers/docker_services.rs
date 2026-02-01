use axum::{Json, response::IntoResponse, http::StatusCode};
use bollard::Docker;
use bollard::query_parameters::{ListContainersOptions, StatsOptions};
use bollard::models::{ContainerSummary, ContainerStatsResponse};
use futures_util::stream::TryStreamExt;
use serde_json::json;
use std::collections::HashMap;
use sysinfo::{System, RefreshKind};

type ServiceAgg = (f64, u64, u64, u32); // cpu_sum, mem_used_sum, mem_limit_sum, count

// ===================== HTTP HANDLER =====================

pub async fn services() -> impl IntoResponse {
    let host_cores = get_host_cores();

    let docker = match connect_docker() {
        Ok(d) => d,
        Err(e) => return error(e),
    };

    let containers = match list_running_containers(&docker).await {
        Ok(c) => c,
        Err(e) => return error(e),
    };

    let mut services: HashMap<String, ServiceAgg> = HashMap::new();

    for c in containers {
        let id = match c.id.as_deref() {
            Some(id) => id,
            None => continue,
        };

        let service_name = get_service_name(&c);

        if let Some(stats) = get_container_stats(&docker, id).await {
            let cpu = calc_cpu_percent(&stats);
            let (mem_used, mem_limit) = calc_memory(&stats);

            let entry = services.entry(service_name).or_insert((0.0, 0, 0, 0));
            entry.0 += cpu;
            entry.1 += mem_used;
            entry.2 += mem_limit;
            entry.3 += 1;
        }
    }

    let result = build_response(services, host_cores);
    (StatusCode::OK, Json(result))
}

// ===================== DOCKER LAYER =====================

fn connect_docker() -> Result<Docker, String> {
    Docker::connect_with_local_defaults().map_err(|e| e.to_string())
}

async fn list_running_containers(docker: &Docker) -> Result<Vec<ContainerSummary>, String> {
    docker.list_containers(Some(ListContainersOptions {
        all: false,
        ..Default::default()
    }))
    .await
    .map_err(|e| e.to_string())
}

async fn get_container_stats(docker: &Docker, id: &str) -> Option<ContainerStatsResponse> {
    let mut stream = docker.stats(id, Some(StatsOptions { stream: false, one_shot: true }));
    match stream.try_next().await {
        Ok(Some(stats)) => Some(stats),
        _ => None,
    }
}

fn get_service_name(c: &ContainerSummary) -> String {
    c.labels
        .as_ref()
        .and_then(|l| l.get("com.docker.swarm.service.name"))
        .cloned()
        .unwrap_or_else(|| "standalone".into())
}

// ===================== CALCULATIONS =====================

fn calc_cpu_percent(stats: &ContainerStatsResponse) -> f64 {
    let cpu_stats = match stats.cpu_stats.as_ref() { Some(v) => v, None => return 0.0 };
    let precpu_stats = match stats.precpu_stats.as_ref() { Some(v) => v, None => return 0.0 };
    let cpu_usage = match cpu_stats.cpu_usage.as_ref() { Some(v) => v, None => return 0.0 };
    let precpu_usage = match precpu_stats.cpu_usage.as_ref() { Some(v) => v, None => return 0.0 };

    let cpu_delta = cpu_usage.total_usage.unwrap_or(0)
        .saturating_sub(precpu_usage.total_usage.unwrap_or(0));

    let system_delta = cpu_stats.system_cpu_usage.unwrap_or(0)
        .saturating_sub(precpu_stats.system_cpu_usage.unwrap_or(0));

    let online_cpus = cpu_stats.online_cpus.unwrap_or(1);

    if system_delta > 0 {
        (cpu_delta as f64 / system_delta as f64) * online_cpus as f64 * 100.0
    } else { 0.0 }
}

fn calc_memory(stats: &ContainerStatsResponse) -> (u64, u64) {
    let mem_used = stats.memory_stats.as_ref().and_then(|m| m.usage).unwrap_or(0);
    let mem_limit = stats.memory_stats.as_ref().and_then(|m| m.limit).unwrap_or(mem_used);
    (mem_used, mem_limit)
}

fn get_host_cores() -> usize {
    let sys = System::new_with_specifics(RefreshKind::everything());
    sys.cpus().len()
}

// ===================== RESPONSE =====================

fn build_response(services: HashMap<String, ServiceAgg>, host_cores: usize) -> serde_json::Value {
    let list: Vec<_> = services.into_iter().map(|(name, (cpu, mem_used, mem_limit, count))| {
        let mem_percent = if mem_limit > 0 {
            (mem_used as f64 / mem_limit as f64) * 100.0
        } else { 0.0 };

        json!({
            "name": name,
            "containers": count,
            "info": {
                "cpu": {
                    "percent": (cpu * 10.0).round() / 10.0,
                    "total": host_cores
                },
                "ram": {
                    "percent": (mem_percent * 10.0).round() / 10.0,
                    "total": mem_limit,
                    "used": mem_used
                }
            }
        })
    }).collect();

    json!(list)
}

fn error(msg: String) -> (StatusCode, Json<serde_json::Value>) {
    (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": msg })))
}
