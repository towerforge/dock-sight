use axum::response::IntoResponse;
use axum::http::StatusCode;
use axum::Json;
use serde_json::json;

const VERSION: &str = env!("CARGO_PKG_VERSION");

pub async fn version() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(json!({ "version": VERSION })),
    )
}
