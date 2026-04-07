use axum::{Json, response::IntoResponse, http::StatusCode, extract::Query};
use bollard::Docker;
use bollard::query_parameters::UpdateServiceOptionsBuilder;
use bollard::service::{
    ServiceSpec, TaskSpec, TaskSpecContainerSpec,
    ServiceSpecMode, ServiceSpecModeReplicated,
    EndpointSpec, EndpointPortConfig,
    EndpointPortConfigProtocolEnum, EndpointPortConfigPublishModeEnum,
    NetworkAttachmentConfig,
};
use serde::Deserialize;
use serde_json::json;

use super::{ServiceQuery, error};

#[derive(Deserialize)]
pub struct ScaleServiceRequest {
    pub name: String,
    pub replicas: i64,
}

#[derive(Deserialize)]
pub struct CreateServiceRequest {
    pub name: String,
    pub image: String,
    pub replicas: Option<u32>,
    pub ports: Option<Vec<String>>,    // "host:container"
    pub env: Option<Vec<String>>,      // "KEY=VALUE"
    pub networks: Option<Vec<String>>, // network names
}

pub async fn create_service(Json(body): Json<CreateServiceRequest>) -> impl IntoResponse {
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

    match docker.create_service(spec, None).await {
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
