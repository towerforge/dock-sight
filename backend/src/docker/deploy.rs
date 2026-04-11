use axum::{Json, response::IntoResponse, http::StatusCode, extract::{Query, State}};
use bollard::Docker;
use bollard::auth::DockerCredentials;
use bollard::query_parameters::UpdateServiceOptionsBuilder;
use bollard::service::{
    ServiceSpec, TaskSpec, TaskSpecContainerSpec,
    ServiceSpecMode, ServiceSpecModeReplicated,
    EndpointSpec, EndpointPortConfig,
    EndpointPortConfigProtocolEnum, EndpointPortConfigPublishModeEnum,
    NetworkAttachmentConfig,
    Mount, MountTypeEnum,
};
use serde::Deserialize;
use serde_json::json;

use crate::auth::AuthState;
use super::{ServiceQuery, error};

#[derive(Deserialize)]
pub struct ScaleServiceRequest {
    pub name: String,
    pub replicas: i64,
}

#[derive(Deserialize)]
pub struct CreateServiceRequest {
    pub name:        String,
    pub image:       String,
    pub replicas:    Option<u32>,
    pub ports:       Option<Vec<String>>,    // "host:container"
    pub env:         Option<Vec<String>>,    // "KEY=VALUE"
    pub networks:    Option<Vec<String>>,    // network names
    pub registry_id: Option<String>,
}

pub async fn create_service(
    State(auth): State<AuthState>,
    Json(body): Json<CreateServiceRequest>,
) -> impl IntoResponse {
    let docker = match Docker::connect_with_local_defaults() {
        Ok(d) => d,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": e.to_string() }))),
    };

    let ports: Vec<EndpointPortConfig> = body.ports.unwrap_or_default().iter().filter_map(|p| {
        let parts: Vec<&str> = p.split(':').collect();
        if let [host, container] = parts.as_slice() {
            Some(EndpointPortConfig {
                published_port: host.parse::<i64>().ok(),
                target_port: container.parse::<i64>().ok(),
                protocol: Some(EndpointPortConfigProtocolEnum::TCP),
                publish_mode: Some(EndpointPortConfigPublishModeEnum::INGRESS),
                name: None,
            })
        } else {
            None
        }
    }).collect();

    let env = body.env.filter(|e| !e.is_empty());

    let networks: Option<Vec<NetworkAttachmentConfig>> = body.networks
        .filter(|n| !n.is_empty())
        .map(|names| names.into_iter().map(|n| NetworkAttachmentConfig {
            target: Some(n),
            ..Default::default()
        }).collect());

    let spec = ServiceSpec {
        name: Some(body.name),
        task_template: Some(TaskSpec {
            container_spec: Some(TaskSpecContainerSpec {
                image: Some(body.image),
                env,
                ..Default::default()
            }),
            networks,
            ..Default::default()
        }),
        mode: Some(ServiceSpecMode {
            replicated: Some(ServiceSpecModeReplicated {
                replicas: Some(body.replicas.unwrap_or(1) as i64),
            }),
            ..Default::default()
        }),
        endpoint_spec: if ports.is_empty() {
            None
        } else {
            Some(EndpointSpec {
                ports: Some(ports),
                ..Default::default()
            })
        },
        ..Default::default()
    };

    let credentials = if let Some(ref id) = body.registry_id {
        let config = auth.config.lock().await;
        config.registries.iter()
            .find(|r| r.id == *id)
            .map(|r| DockerCredentials {
                username:      Some(r.username.clone()),
                password:      Some(r.token.clone()),
                serveraddress: Some("https://index.docker.io/v1/".to_string()),
                ..Default::default()
            })
    } else {
        None
    };

    match docker.create_service(spec, credentials).await {
        Ok(response) => (StatusCode::OK, Json(json!({ "id": response.id }))),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": e.to_string() }))),
    }
}

pub async fn scale_service(Json(body): Json<ScaleServiceRequest>) -> impl IntoResponse {
    let docker = match Docker::connect_with_local_defaults() {
        Ok(d) => d,
        Err(e) => return error(e.to_string()),
    };

    let service = match docker.inspect_service(&body.name, None).await {
        Ok(s) => s,
        Err(e) => return error(e.to_string()),
    };

    let version = service.version
        .and_then(|v| v.index)
        .unwrap_or(0);

    let mut spec = service.spec.unwrap_or_default();
    if let Some(mode) = spec.mode.as_mut() {
        if let Some(replicated) = mode.replicated.as_mut() {
            replicated.replicas = Some(body.replicas);
        } else {
            mode.replicated = Some(ServiceSpecModeReplicated { replicas: Some(body.replicas) });
        }
    } else {
        spec.mode = Some(ServiceSpecMode {
            replicated: Some(ServiceSpecModeReplicated { replicas: Some(body.replicas) }),
            ..Default::default()
        });
    }

    let options = UpdateServiceOptionsBuilder::default()
        .version(version as i32)
        .build();

    match docker.update_service(&body.name, spec, options, None).await {
        Ok(_) => (StatusCode::OK, Json(json!({ "ok": true }))),
        Err(e) => error(e.to_string()),
    }
}

pub async fn pull_service(
    State(auth): State<AuthState>,
    Query(q): Query<ServiceQuery>,
) -> impl IntoResponse {
    let docker = match Docker::connect_with_local_defaults() {
        Ok(d) => d,
        Err(e) => return error(e.to_string()),
    };

    let service = match docker.inspect_service(&q.name, None).await {
        Ok(s) => s,
        Err(e) => return error(e.to_string()),
    };

    let version = service.version.and_then(|v| v.index).unwrap_or(0);

    let mut spec = service.spec.unwrap_or_default();

    // Strip digest so Docker re-pulls the tag instead of pinning to the cached layer.
    // Increment force_update to force redeployment even if Docker thinks the image is current.
    if let Some(task) = spec.task_template.as_mut() {
        if let Some(container) = task.container_spec.as_mut() {
            if let Some(img) = container.image.as_ref() {
                container.image = Some(img.split('@').next().unwrap_or(img).to_string());
            }
        }
        task.force_update = Some(task.force_update.unwrap_or(0) + 1);
    }

    let image_ref = spec.task_template.as_ref()
        .and_then(|t| t.container_spec.as_ref())
        .and_then(|c| c.image.as_deref())
        .unwrap_or("")
        .to_string();

    let credentials = {
        let config = auth.config.lock().await;
        config.registries.iter()
            .find(|r| image_ref.starts_with(&format!("{}/", r.username)))
            .map(|r| DockerCredentials {
                username:      Some(r.username.clone()),
                password:      Some(r.token.clone()),
                serveraddress: Some("https://index.docker.io/v1/".to_string()),
                ..Default::default()
            })
    };

    let options = UpdateServiceOptionsBuilder::default()
        .version(version as i32)
        .build();

    match docker.update_service(&q.name, spec, options, credentials).await {
        Ok(_) => (StatusCode::OK, Json(json!({ "ok": true }))),
        Err(e) => error(e.to_string()),
    }
}

#[derive(Deserialize)]
pub struct PortConfigItem {
    pub host_port:      Option<i64>,
    pub container_port: i64,
    pub protocol:       String,   // "tcp" | "udp" | "tcp+udp"
    pub publish_mode:   String,   // "ingress" | "host"
}

#[derive(Deserialize)]
pub struct UpdateServicePortsRequest {
    pub name:  String,
    pub ports: Vec<PortConfigItem>,
}

pub async fn update_service_ports(Json(body): Json<UpdateServicePortsRequest>) -> impl IntoResponse {
    let docker = match Docker::connect_with_local_defaults() {
        Ok(d) => d,
        Err(e) => return error(e.to_string()),
    };

    let service = match docker.inspect_service(&body.name, None).await {
        Ok(s) => s,
        Err(e) => return error(e.to_string()),
    };

    let version = service.version.and_then(|v| v.index).unwrap_or(0);
    let mut spec = service.spec.unwrap_or_default();

    let mut ports: Vec<EndpointPortConfig> = Vec::new();
    for p in &body.ports {
        let publish_mode = if p.publish_mode == "host" {
            EndpointPortConfigPublishModeEnum::HOST
        } else {
            EndpointPortConfigPublishModeEnum::INGRESS
        };
        let protocols: Vec<EndpointPortConfigProtocolEnum> = if p.protocol == "tcp+udp" {
            vec![EndpointPortConfigProtocolEnum::TCP, EndpointPortConfigProtocolEnum::UDP]
        } else if p.protocol == "udp" {
            vec![EndpointPortConfigProtocolEnum::UDP]
        } else {
            vec![EndpointPortConfigProtocolEnum::TCP]
        };
        for proto in protocols {
            ports.push(EndpointPortConfig {
                published_port: p.host_port,
                target_port:    Some(p.container_port),
                protocol:       Some(proto),
                publish_mode:   Some(publish_mode.clone()),
                name:           None,
            });
        }
    }

    spec.endpoint_spec = Some(EndpointSpec {
        ports: Some(ports),
        ..Default::default()
    });

    let options = UpdateServiceOptionsBuilder::default()
        .version(version as i32)
        .build();

    match docker.update_service(&body.name, spec, options, None).await {
        Ok(_) => (StatusCode::OK, Json(json!({ "ok": true }))),
        Err(e) => error(e.to_string()),
    }
}

#[derive(Deserialize)]
pub struct MountConfigItem {
    pub source:    Option<String>,
    pub target:    String,
    pub typ:       String,        // "bind" | "volume" | "tmpfs"
    pub read_only: Option<bool>,
}

#[derive(Deserialize)]
pub struct UpdateServiceMountsRequest {
    pub name:   String,
    pub mounts: Vec<MountConfigItem>,
}

pub async fn update_service_mounts(Json(body): Json<UpdateServiceMountsRequest>) -> impl IntoResponse {
    let docker = match Docker::connect_with_local_defaults() {
        Ok(d) => d,
        Err(e) => return error(e.to_string()),
    };

    let service = match docker.inspect_service(&body.name, None).await {
        Ok(s) => s,
        Err(e) => return error(e.to_string()),
    };

    let version = service.version.and_then(|v| v.index).unwrap_or(0);
    let mut spec = service.spec.unwrap_or_default();

    let mounts: Vec<Mount> = body.mounts.iter().map(|m| {
        let typ = match m.typ.as_str() {
            "volume" => MountTypeEnum::VOLUME,
            "tmpfs"  => MountTypeEnum::TMPFS,
            _        => MountTypeEnum::BIND,
        };
        Mount {
            target:    Some(m.target.clone()),
            source:    m.source.clone().filter(|s| !s.is_empty()),
            typ:       Some(typ),
            read_only: m.read_only,
            ..Default::default()
        }
    }).collect();

    if let Some(task) = spec.task_template.as_mut() {
        if let Some(container) = task.container_spec.as_mut() {
            container.mounts = if mounts.is_empty() { None } else { Some(mounts) };
        }
    }

    let options = UpdateServiceOptionsBuilder::default()
        .version(version as i32)
        .build();

    match docker.update_service(&body.name, spec, options, None).await {
        Ok(_) => (StatusCode::OK, Json(json!({ "ok": true }))),
        Err(e) => error(e.to_string()),
    }
}

pub async fn delete_service(Query(q): Query<ServiceQuery>) -> impl IntoResponse {
    let docker = match Docker::connect_with_local_defaults() {
        Ok(d) => d,
        Err(e) => return error(e.to_string()),
    };
    match docker.delete_service(&q.name).await {
        Ok(_) => (StatusCode::OK, Json(json!({ "ok": true }))),
        Err(e) => error(e.to_string()),
    }
}
