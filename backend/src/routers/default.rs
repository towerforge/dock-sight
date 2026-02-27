use axum::http::HeaderMap;
use axum::response::IntoResponse;
use axum::http::StatusCode;
use axum::Json;
use serde_json::json;

// Handler compatible with axum: receives `HeaderMap` and responds with `StatusCode`.
pub async fn is_json_request(headers: HeaderMap) -> impl IntoResponse {
    if let Some(content_type) = headers.get("Content-Type") {
        if let Ok(content_type_str) = content_type.to_str() {
            if content_type_str.contains("application/json") {
                return (StatusCode::OK, Json(json!({"ok": true})));
            }
        }
    }
    (
        StatusCode::BAD_REQUEST,
        Json(json!({"ok": false, "error": "request is not JSON"})),
    )
}
