use axum::{Json, response::IntoResponse, http::StatusCode};
use bollard::Docker;
use bollard::query_parameters::{ListContainersOptions, StatsOptions};
use bollard::models::{ContainerSummary, ContainerStatsResponse};
use futures_util::future::join_all;
use futures_util::stream::TryStreamExt;
use serde_json::json;
use std::collections::HashMap;
use std::time::Duration;

use super::{get_service_name, error};

type ServiceAgg = (f64, u64, u64, u32); // cpu_sum, mem_used_sum, mem_limit_sum, count

pub async fn services() -> impl IntoResponse {
    let docker = match Docker::connect_with_local_defaults() {
        Ok(d) => d,
        Err(e) => return error(e.to_string()),
    };

    let containers = match docker.list_containers(Some(ListContainersOptions {
        all: false,
        ..Default::default()
    })).await {
        Ok(c) => c,
        Err(e) => return error(e.to_string()),
    };

    let tasks = containers.iter().map(|c| measure_container(&docker, c));
    let results = join_all(tasks).await;

    let mut services: HashMap<String, ServiceAgg> = HashMap::new();

    for (service_name, cpu, mem_used, mem_limit) in results.into_iter().flatten() {
        let entry = services.entry(service_name).or_insert((0.0, 0, 0, 0));
        entry.0 += cpu;
        entry.1 += mem_used;
        entry.2 += mem_limit;
        entry.3 += 1;
    }

    let list: Vec<_> = services.into_iter().map(|(name, (cpu, mem_used, mem_limit, count))| {
        let mem_percent = if mem_limit > 0 {
            (mem_used as f64 / mem_limit as f64) * 100.0
        } else { 0.0 };

        json!({
            "name": name,
            "containers": count,
            "info": {
                "cpu": { "percent": (cpu * 10.0).round() / 10.0 },
                "ram": {
                    "percent": (mem_percent * 10.0).round() / 10.0,
                    "total": mem_limit,
                    "used": mem_used
                }
            }
        })
    }).collect();

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
