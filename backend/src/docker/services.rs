use axum::{Json, response::IntoResponse, http::StatusCode};
use bollard::Docker;
use bollard::query_parameters::ListContainersOptions;
use bollard::query_parameters::StatsOptions;
use bollard::models::{ContainerSummary, ContainerStatsResponse};
use chrono::DateTime;
use futures_util::future::join_all;
use futures_util::stream::TryStreamExt;
use serde_json::json;
use std::collections::HashMap;
use std::time::Duration;

use super::{get_service_name, error};

async fn build_network_map(docker: &Docker) -> HashMap<String, String> {
    docker.list_networks(None::<bollard::query_parameters::ListNetworksOptions>).await
        .unwrap_or_default()
        .into_iter()
        .filter_map(|n| Some((n.id?, n.name?)))
        .collect()
}

type Metrics = (f64, u64, u64, u32); // cpu, mem_used, mem_limit, count

pub async fn services() -> impl IntoResponse {
    let docker = match Docker::connect_with_local_defaults() {
        Ok(d) => d,
        Err(e) => return error(e.to_string()),
    };

    // All Swarm services — includes paused ones (0 replicas)
    let swarm_services = match docker.list_services(None).await {
        Ok(s) => s,
        Err(e) => return error(e.to_string()),
    };

    let net_map = build_network_map(&docker).await;

    // Running containers for CPU/RAM metrics
    let containers = match docker.list_containers(Some(ListContainersOptions {
        all: false,
        ..Default::default()
    })).await {
        Ok(c) => c,
        Err(e) => return error(e.to_string()),
    };

    let tasks = containers.iter().map(|c| measure_container(&docker, c));
    let results = join_all(tasks).await;

    let mut metrics: HashMap<String, Metrics> = HashMap::new();
    for (service_name, cpu, mem_used, mem_limit) in results.into_iter().flatten() {
        let entry = metrics.entry(service_name).or_insert((0.0, 0, 0, 0));
        entry.0 += cpu;
        entry.1 += mem_used;
        entry.2 += mem_limit;
        entry.3 += 1;
    }

    // Build response: one entry per Swarm service
    let list_tasks = swarm_services.iter().map(|svc| {
        let docker = &docker;
        let metrics = &metrics;
        let net_map = &net_map;
        async move {
            let name = svc.spec.as_ref()
                .and_then(|s| s.name.as_deref())
                .unwrap_or("")
                .to_string();

            let image = svc.spec.as_ref()
                .and_then(|s| s.task_template.as_ref())
                .and_then(|t| t.container_spec.as_ref())
                .and_then(|c| c.image.as_deref())
                .unwrap_or("")
                .to_string();

            // Strip digest (e.g. "nginx:latest@sha256:...")
            let image_ref = image.split('@').next().unwrap_or(&image);

            let last_deployed = if !image_ref.is_empty() {
                docker.inspect_image(image_ref).await.ok()
                    .and_then(|img| img.created)
                    .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                    .map(|dt| dt.timestamp())
                    .unwrap_or(0)
            } else { 0 };

            let (cpu, mem_used, mem_limit, count) = metrics.get(&name).copied().unwrap_or((0.0, 0, 0, 0));
            let mem_percent = if mem_limit > 0 {
                (mem_used as f64 / mem_limit as f64) * 100.0
            } else { 0.0 };

            // Use endpoint.virtual_ips — works for both stack and standalone services
            let networks: Vec<&str> = svc.endpoint.as_ref()
                .and_then(|e| e.virtual_ips.as_ref())
                .map(|vips| {
                    vips.iter()
                        .filter_map(|vip| vip.network_id.as_deref())
                        .filter_map(|id| net_map.get(id).map(String::as_str))
                        .filter(|n| *n != "docker_gwbridge")
                        .collect()
                })
                .unwrap_or_default();

            json!({
                "name": name,
                "containers": count,
                "last_deployed": last_deployed,
                "networks": networks,
                "info": {
                    "cpu": { "percent": (cpu * 10.0).round() / 10.0 },
                    "ram": {
                        "percent": (mem_percent * 10.0).round() / 10.0,
                        "total": mem_limit,
                        "used": mem_used
                    }
                }
            })
        }
    });

    let list: Vec<_> = join_all(list_tasks).await;
    (StatusCode::OK, Json(serde_json::Value::Array(list)))
}

async fn measure_container(
    docker: &Docker,
    c: &ContainerSummary,
) -> Option<(String, f64, u64, u64)> {
    let id = c.id.as_deref()?;
    let service_name = get_service_name(c);

    let first = get_stats(docker, id).await?;
    tokio::time::sleep(Duration::from_millis(500)).await;
    let second = get_stats(docker, id).await?;

    let cpu = calc_cpu_between(&first, &second);
    let (mem_used, mem_limit) = calc_memory(&second);

    Some((service_name, cpu, mem_used, mem_limit))
}

async fn get_stats(docker: &Docker, id: &str) -> Option<ContainerStatsResponse> {
    let mut stream = docker.stats(id, Some(StatsOptions { stream: false, one_shot: true }));
    stream.try_next().await.ok().flatten()
}

fn calc_cpu_between(a: &ContainerStatsResponse, b: &ContainerStatsResponse) -> f64 {
    let cpu_a = match a.cpu_stats.as_ref() { Some(v) => v, None => return 0.0 };
    let cpu_b = match b.cpu_stats.as_ref() { Some(v) => v, None => return 0.0 };

    let usage_a = cpu_a.cpu_usage.as_ref().and_then(|u| u.total_usage).unwrap_or(0);
    let usage_b = cpu_b.cpu_usage.as_ref().and_then(|u| u.total_usage).unwrap_or(0);

    let system_a = cpu_a.system_cpu_usage.unwrap_or(0);
    let system_b = cpu_b.system_cpu_usage.unwrap_or(0);
    let online_cpus = cpu_b.online_cpus.unwrap_or(1);

    let cpu_delta = usage_b.saturating_sub(usage_a) as f64;
    let system_delta = system_b.saturating_sub(system_a) as f64;

    if system_delta > 0.0 {
        (cpu_delta / system_delta) * online_cpus as f64 * 100.0
    } else {
        0.0
    }
}

fn calc_memory(stats: &ContainerStatsResponse) -> (u64, u64) {
    let mem = match stats.memory_stats.as_ref() {
        Some(m) => m,
        None => return (0, 0),
    };

    let usage = mem.usage.unwrap_or(0);
    let cache = mem.stats.as_ref().and_then(|s| s.get("cache")).copied().unwrap_or(0);
    let real_used = usage.saturating_sub(cache);
    let limit = mem.limit.unwrap_or(real_used);

    (real_used, limit)
}
