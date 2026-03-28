use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::json;

use super::AuthState;

pub fn extract_session_cookie(headers: &HeaderMap) -> Option<String> {
    headers
        .get("cookie")?
        .to_str()
        .ok()
        .and_then(|cookies| {
            cookies
                .split(';')
                .find(|c| c.trim().starts_with("dock_sight_session="))
                .and_then(|c| c.trim().strip_prefix("dock_sight_session="))
                .map(|v| v.to_string())
        })
}

pub async fn status(
    State(auth): State<AuthState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let setup_required = auth.config.lock().await.password_hash.is_none();

    let authenticated = if setup_required {
        false
    } else if let Some(token) = extract_session_cookie(&headers) {
        auth.is_session_valid(&token).await
    } else {
        false
    };

    Json(json!({
        "setup_required": setup_required,
        "authenticated": authenticated,
    }))
}

#[derive(Deserialize)]
pub struct SetupRequest {
    password: String,
    confirm_password: String,
}

pub async fn setup(
    State(auth): State<AuthState>,
    Json(body): Json<SetupRequest>,
) -> impl IntoResponse {
    {
        let config = auth.config.lock().await;
        if config.password_hash.is_some() {
            return (
                StatusCode::BAD_REQUEST,
                HeaderMap::new(),
                Json(json!({ "error": "Password already configured" })),
            );
        }
    }

    if body.password != body.confirm_password {
        return (
            StatusCode::BAD_REQUEST,
            HeaderMap::new(),
            Json(json!({ "error": "Passwords do not match" })),
        );
    }

    if body.password.len() < 8 {
        return (
            StatusCode::BAD_REQUEST,
            HeaderMap::new(),
            Json(json!({ "error": "Password must be at least 8 characters" })),
        );
    }

    match bcrypt::hash(&body.password, bcrypt::DEFAULT_COST) {
        Ok(hash) => {
            auth.config.lock().await.password_hash = Some(hash);
            auth.save_config().await;

            let token = auth.create_session().await;
            let max_age = auth.session_duration.as_secs();
            let mut headers = HeaderMap::new();
            headers.insert(
                "Set-Cookie",
                format!(
                    "dock_sight_session={}; HttpOnly; SameSite=Lax; Max-Age={}; Path=/",
                    token, max_age
                )
                .parse()
                .unwrap(),
            );
            (StatusCode::OK, headers, Json(json!({ "ok": true })))
        }
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            HeaderMap::new(),
            Json(json!({ "error": "Failed to hash password" })),
        ),
    }
}

#[derive(Deserialize)]
pub struct LoginRequest {
    password: String,
}

pub async fn login(
    State(auth): State<AuthState>,
    Json(body): Json<LoginRequest>,
) -> impl IntoResponse {
    let hash = {
        let config = auth.config.lock().await;
        match &config.password_hash {
            Some(h) => h.clone(),
            None => {
                return (
                    StatusCode::BAD_REQUEST,
                    HeaderMap::new(),
                    Json(json!({ "error": "No password configured" })),
                );
            }
        }
    };

    match bcrypt::verify(&body.password, &hash) {
        Ok(true) => {
            let token = auth.create_session().await;
            let max_age = auth.session_duration.as_secs();
            let mut headers = HeaderMap::new();
            headers.insert(
                "Set-Cookie",
                format!(
                    "dock_sight_session={}; HttpOnly; SameSite=Lax; Max-Age={}; Path=/",
                    token, max_age
                )
                .parse()
                .unwrap(),
            );
            (StatusCode::OK, headers, Json(json!({ "ok": true })))
        }
        Ok(false) => (
            StatusCode::UNAUTHORIZED,
            HeaderMap::new(),
            Json(json!({ "error": "Incorrect password" })),
        ),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            HeaderMap::new(),
            Json(json!({ "error": "Authentication error" })),
        ),
    }
}

pub async fn logout(
    State(auth): State<AuthState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    if let Some(token) = extract_session_cookie(&headers) {
        auth.remove_session(&token).await;
    }

    let mut response_headers = HeaderMap::new();
    response_headers.insert(
        "Set-Cookie",
        "dock_sight_session=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/"
            .parse()
            .unwrap(),
    );

    (StatusCode::OK, response_headers, Json(json!({ "ok": true })))
}
