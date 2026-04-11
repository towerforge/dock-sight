use axum::{
    routing::{get, post, put},
    Router,
    http::{HeaderMap, StatusCode},
    extract::Path,
    response::{IntoResponse, Response},
    body::Body,
    Json,
};
use tower_http::cors::{CorsLayer, Any};
use axum::http::HeaderValue;
use serde_json::json;
use mime_guess;

use crate::auth::{AuthState, middleware::require_auth, routes as auth_routes};
use crate::system::routes::sysinfo;
use crate::docker::{
    services, service_containers, delete_container, service_images, delete_image,
    service_logs, cleanup_preview, run_cleanup, create_service, delete_service,
    scale_service, pull_service, update_service_ports, update_service_mounts,
    list_networks, create_network, delete_network,
    list_docker_volumes, create_volume, delete_volume,
};
use crate::registries::{list_registries, create_registry, delete_registry};
use crate::users::{list_users, create_user, delete_user, update_user};
use crate::openapi::ApiDoc;
use utoipa::OpenApi;

pub fn create_router(dev_mode: bool, port: u16) -> Router {
    use axum::http::Method;

    let auth_state = AuthState::new();

    let cors = if dev_mode {
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
            .allow_headers(Any)
    } else {
        let origins = [
            format!("http://localhost:{}", port),
            format!("http://127.0.0.1:{}", port),
        ]
        .into_iter()
        .filter_map(|o| o.parse::<HeaderValue>().ok())
        .collect::<Vec<_>>();

        CorsLayer::new()
            .allow_origin(origins)
            .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
            .allow_headers(Any)
    };

    // Public auth routes — no session required
    let auth_router = Router::new()
        .route("/api/auth/status", get(auth_routes::status))
        .route("/api/auth/setup",  post(auth_routes::setup))
        .route("/api/auth/login",  post(auth_routes::login))
        .route("/api/auth/logout", post(auth_routes::logout))
        .with_state(auth_state.clone());

    // API routes — session-protected in production
    let api_routes = Router::new()
        .route("/default", get(is_json_request).options(|| async { StatusCode::OK }))
        .route("/sysinfo",                     get(sysinfo))
        .route("/docker-service",              get(services).post(create_service).delete(delete_service))
        .route("/docker-service/scale",        post(scale_service))
        .route("/docker-service/ports",        put(update_service_ports))
        .route("/docker-service/mounts",       put(update_service_mounts))
        .route("/docker-service/pull",         post(pull_service))
        .route("/docker-service/containers",   get(service_containers).delete(delete_container))
        .route("/docker-service/images",       get(service_images).delete(delete_image))
        .route("/docker-service/logs",         get(service_logs))
        .route("/docker-service/cleanup",      get(cleanup_preview).delete(run_cleanup))
        .route("/docker-network",              get(list_networks).post(create_network).delete(delete_network))
        .route("/docker-volumes",              get(list_docker_volumes).post(create_volume).delete(delete_volume))
        .route("/registries",                  get(list_registries).post(create_registry).delete(delete_registry))
        // Auth: current-user info + own credential changes
        .route("/api/auth/me",                 get(auth_routes::me))
        .route("/api/auth/credentials",        put(auth_routes::update_credentials))
        // Security: rate-limit status (admin only)
        .route("/api/auth/security",           get(auth_routes::security_status).delete(auth_routes::security_clear).put(auth_routes::security_set_rate_limit))
        // User management (admin-only checks inside handlers)
        .route("/users",                       get(list_users).post(create_user).delete(delete_user))
        .route("/users/update",                put(update_user))
        .route("/version",                     get(version))
        .route("/openapi.json",                get(|| async { axum::Json(ApiDoc::openapi()) }))
        .with_state(auth_state.clone());

    let api_router = if dev_mode {
        api_routes
    } else {
        api_routes.layer(axum::middleware::from_fn_with_state(
            auth_state.clone(),
            require_auth,
        ))
    };

    let mut router = Router::new()
        .merge(auth_router)
        .merge(api_router)
        .layer(cors);

    if !dev_mode {
        router = router
            .route("/", get(|| async { static_handler(Path("".into())).await }))
            .route("/{*path}", get(static_handler));
    }

    router
}

async fn is_json_request(headers: HeaderMap) -> impl IntoResponse {
    if let Some(content_type) = headers.get("Content-Type") {
        if let Ok(ct) = content_type.to_str() {
            if ct.contains("application/json") {
                return (StatusCode::OK, Json(json!({"ok": true})));
            }
        }
    }
    (StatusCode::BAD_REQUEST, Json(json!({"ok": false, "error": "request is not JSON"})))
}

async fn version() -> impl IntoResponse {
    const VERSION: &str = env!("CARGO_PKG_VERSION");
    (StatusCode::OK, Json(json!({ "version": VERSION })))
}

pub async fn static_handler(Path(path): Path<String>) -> impl IntoResponse {
    let mut lookup_path = if path.is_empty() {
        "index.html".to_string()
    } else {
        path.clone()
    };

    if !lookup_path.contains('.') {
        lookup_path = "index.html".to_string();
    }

    match super::Assets::get(&lookup_path) {
        Some(content) => {
            let mime  = mime_guess::from_path(&lookup_path).first_or_octet_stream();
            let bytes = content.data.into_owned();
            Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", mime.as_ref())
                .body(Body::from(bytes))
                .unwrap()
        }
        None => Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(Body::from(format!("404 - Not found: {}", lookup_path)))
            .unwrap(),
    }
}
