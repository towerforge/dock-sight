use axum::{Json, response::IntoResponse, http::StatusCode};
use bollard::Docker;
use bollard::service::{
    ServiceSpec, TaskSpec, TaskSpecContainerSpec,
    ServiceSpecMode, ServiceSpecModeReplicated,
    EndpointSpec, EndpointPortConfig,
    EndpointPortConfigProtocolEnum, EndpointPortConfigPublishModeEnum,
};
use serde::Deserialize;
use serde_json::json;

#[derive(Deserialize)]
pub struct CreateServiceRequest {
    pub name: String,
    pub image: String,
    pub replicas: Option<u32>,
    pub ports: Option<Vec<String>>,  // "host:container"
    pub env: Option<Vec<String>>,    // "KEY=VALUE"
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

    let spec = ServiceSpec {
        name: Some(body.name),
        task_template: Some(TaskSpec {
            container_spec: Some(TaskSpecContainerSpec {
                image: Some(body.image),
                env,
                ..Default::default()
            }),
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
