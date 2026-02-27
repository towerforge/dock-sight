use axum::{
    routing::{get},
    Router,
    http::StatusCode,
    extract::Path,
    response::{IntoResponse, Response},
    body::Body,
};
use tower_http::cors::{CorsLayer, Any};

use crate::routers::default::is_json_request;
use crate::routers::sysinfo::sysinfo;
use crate::routers::docker_services::services;
use crate::openapi::ApiDoc; 
use utoipa::OpenApi;
use mime_guess;

pub fn create_router(dev_mode: bool) -> Router {
    use axum::http::Method;

    let mut router = Router::new()
        .route("/default", get(is_json_request).options(|| async { StatusCode::OK }))
        .route("/sysinfo", get(sysinfo))
        .route("/docker-service", get(services))
        .route(
            "/openapi.json",
            get(|| async { axum::Json(ApiDoc::openapi()) })
        )
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
                .allow_headers(Any),
        );

    if !dev_mode {
        router = router
            .route("/", get(|| async { static_handler(Path("".into())).await }))
            .route("/{*path}", get(static_handler));
    }

    router
}

pub async fn static_handler(Path(path): Path<String>) -> impl IntoResponse {
    let mut lookup_path = if path.is_empty() {
        "index.html".to_string()
    } else {
        path.clone()
    };

    if !lookup_path.contains('.') {
        lookup_path.push_str("/index.html");
    }

    match super::Assets::get(&lookup_path) {
        Some(content) => {
            let mime = mime_guess::from_path(&lookup_path).first_or_octet_stream();
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
