use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::json;

use crate::auth::AuthState;

// ── List ──────────────────────────────────────────────────────────────────────

pub async fn list_hosts(State(auth): State<AuthState>) -> impl IntoResponse {
    let db = auth.db.clone();
    let rows = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        let mut stmt = conn
            .prepare(
                "SELECT h.id, h.domain, h.target_url, h.ssl_mode, h.force_https, h.enabled, h.custom_config, h.created_at,
                        c.id, c.expires_at, c.renewed_at
                 FROM   proxy_hosts h
                 LEFT JOIN ssl_certificates c ON c.host_id = h.id
                 ORDER BY h.created_at ASC",
            )
            .unwrap();

        stmt.query_map([], |r| {
            let cert_id: Option<String> = r.get(8)?;
            let certificate = cert_id.map(|cid| json!({
                "id":         cid,
                "host_id":    r.get::<_, String>(0).unwrap_or_default(),
                "expires_at": r.get::<_, i64>(9).unwrap_or(0),
                "renewed_at": r.get::<_, i64>(10).unwrap_or(0),
            }));
            Ok(json!({
                "id":            r.get::<_, String>(0)?,
                "domain":        r.get::<_, String>(1)?,
                "target_url":    r.get::<_, String>(2)?,
                "ssl_mode":      r.get::<_, String>(3)?,
                "force_https":   r.get::<_, bool>(4)?,
                "enabled":       r.get::<_, bool>(5)?,
                "custom_config": r.get::<_, String>(6)?,
                "created_at":    r.get::<_, i64>(7)?,
                "certificate":   certificate,
            }))
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>()
    })
    .await
    .unwrap_or_default();

    (StatusCode::OK, Json(json!(rows)))
}

// ── Get one ───────────────────────────────────────────────────────────────────

pub async fn get_host(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let db = auth.db.clone();
    let result = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        conn.query_row(
            "SELECT h.id, h.domain, h.target_url, h.ssl_mode, h.force_https, h.enabled, h.custom_config, h.created_at,
                    c.id, c.expires_at, c.renewed_at
             FROM   proxy_hosts h
             LEFT JOIN ssl_certificates c ON c.host_id = h.id
             WHERE  h.id = ?1",
            [&id],
            |r| {
                let cert_id: Option<String> = r.get(8)?;
                let certificate = cert_id.map(|cid| json!({
                    "id":         cid,
                    "host_id":    r.get::<_, String>(0).unwrap_or_default(),
                    "expires_at": r.get::<_, i64>(9).unwrap_or(0),
                    "renewed_at": r.get::<_, i64>(10).unwrap_or(0),
                }));
                Ok(json!({
                    "id":            r.get::<_, String>(0)?,
                    "domain":        r.get::<_, String>(1)?,
                    "target_url":    r.get::<_, String>(2)?,
                    "ssl_mode":      r.get::<_, String>(3)?,
                    "force_https":   r.get::<_, bool>(4)?,
                    "enabled":       r.get::<_, bool>(5)?,
                    "custom_config": r.get::<_, String>(6)?,
                    "created_at":    r.get::<_, i64>(7)?,
                    "certificate":   certificate,
                }))
            },
        )
    })
    .await
    .unwrap_or(Err(rusqlite::Error::InvalidQuery));

    match result {
        Ok(host) => (StatusCode::OK, Json(json!(host))),
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            (StatusCode::NOT_FOUND, Json(json!({ "error": "Proxy host not found" })))
        }
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": "Failed to fetch proxy host" }))),
    }
}

// ── Create ────────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct CreateHostRequest {
    domain:        String,
    target_url:    String,
    ssl_mode:      Option<String>,
    force_https:   Option<bool>,
    enabled:       Option<bool>,
    custom_config: Option<String>,
}

pub async fn create_host(
    State(auth): State<AuthState>,
    Json(body): Json<CreateHostRequest>,
) -> impl IntoResponse {
    let domain = body.domain.trim().to_string();
    let target = body.target_url.trim().to_string();

    if domain.is_empty() || target.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "domain and target_url are required" })),
        );
    }

    let id            = uuid::Uuid::new_v4().to_string();
    let ssl_mode      = body.ssl_mode.unwrap_or_else(|| "none".into());
    let force_https   = body.force_https.unwrap_or(false);
    let enabled       = body.enabled.unwrap_or(true);
    let custom_config = body.custom_config.unwrap_or_default();

    let db = auth.db.clone();
    let id2 = id.clone();
    let result = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        conn.execute(
            "INSERT INTO proxy_hosts (id, domain, target_url, ssl_mode, force_https, enabled, custom_config)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![id2, domain, target, ssl_mode, force_https, enabled, custom_config],
        )
    })
    .await
    .unwrap_or(Err(rusqlite::Error::InvalidQuery));

    match result {
        Ok(_) => (StatusCode::OK, Json(json!({ "id": id }))),
        Err(rusqlite::Error::SqliteFailure(e, _))
            if e.code == rusqlite::ErrorCode::ConstraintViolation =>
        {
            (StatusCode::CONFLICT, Json(json!({ "error": "Domain already exists" })))
        }
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Failed to create proxy host" })),
        ),
    }
}

// ── Update ────────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct UpdateHostRequest {
    domain:        Option<String>,
    target_url:    Option<String>,
    ssl_mode:      Option<String>,
    force_https:   Option<bool>,
    enabled:       Option<bool>,
    custom_config: Option<String>,
}

pub async fn update_host(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
    Json(body): Json<UpdateHostRequest>,
) -> impl IntoResponse {
    let db = auth.db.clone();
    let result = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();

        let current = conn.query_row(
            "SELECT domain, target_url, ssl_mode, force_https, enabled, custom_config
             FROM proxy_hosts WHERE id = ?1",
            [&id],
            |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, String>(2)?,
                    r.get::<_, bool>(3)?,
                    r.get::<_, bool>(4)?,
                    r.get::<_, String>(5)?,
                ))
            },
        );

        match current {
            Ok((domain, target, ssl, force, enabled, custom)) => {
                let new_domain  = body.domain.unwrap_or(domain);
                let new_target  = body.target_url.unwrap_or(target);
                let new_ssl     = body.ssl_mode.unwrap_or(ssl);
                let new_force   = body.force_https.unwrap_or(force);
                let new_enabled = body.enabled.unwrap_or(enabled);
                let new_custom  = body.custom_config.unwrap_or(custom);

                conn.execute(
                    "UPDATE proxy_hosts
                     SET domain=?1, target_url=?2, ssl_mode=?3, force_https=?4, enabled=?5, custom_config=?6
                     WHERE id=?7",
                    rusqlite::params![new_domain, new_target, new_ssl, new_force, new_enabled, new_custom, id],
                )
                .map(|n| n > 0)
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(false),
            Err(e) => Err(e),
        }
    })
    .await
    .unwrap_or(Ok(false));

    match result {
        Ok(true)  => (StatusCode::OK, Json(json!({ "ok": true }))),
        Ok(false) => (StatusCode::NOT_FOUND, Json(json!({ "error": "Proxy host not found" }))),
        Err(_)    => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": "Failed to update proxy host" }))),
    }
}

// ── Delete ────────────────────────────────────────────────────────────────────

pub async fn delete_host(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let db = auth.db.clone();
    let deleted = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        conn.execute("DELETE FROM proxy_hosts WHERE id = ?1", [&id])
            .map(|n| n > 0)
            .unwrap_or(false)
    })
    .await
    .unwrap_or(false);

    if deleted {
        (StatusCode::OK, Json(json!({ "ok": true })))
    } else {
        (StatusCode::NOT_FOUND, Json(json!({ "error": "Proxy host not found" })))
    }
}

// ── Request / renew SSL certificate ──────────────────────────────────────────

pub async fn request_ssl(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let db = auth.db.clone();
    let result = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();

        let exists: bool = conn
            .query_row("SELECT 1 FROM proxy_hosts WHERE id = ?1", [&id], |_| Ok(true))
            .unwrap_or(false);

        if !exists {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }

        let cert_id    = uuid::Uuid::new_v4().to_string();
        let now        = chrono::Utc::now().timestamp();
        let expires_at = now + 90 * 86_400;

        conn.execute(
            "INSERT INTO ssl_certificates (id, host_id, expires_at, renewed_at)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(host_id) DO UPDATE SET expires_at = ?3, renewed_at = ?4",
            rusqlite::params![cert_id, id, expires_at, now],
        )?;

        conn.query_row(
            "SELECT id, host_id, expires_at, renewed_at FROM ssl_certificates WHERE host_id = ?1",
            [&id],
            |r| {
                Ok(json!({
                    "id":         r.get::<_, String>(0)?,
                    "host_id":    r.get::<_, String>(1)?,
                    "expires_at": r.get::<_, i64>(2)?,
                    "renewed_at": r.get::<_, i64>(3)?,
                }))
            },
        )
    })
    .await
    .unwrap_or(Err(rusqlite::Error::InvalidQuery));

    match result {
        Ok(cert) => (StatusCode::OK, Json(json!(cert))),
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            (StatusCode::NOT_FOUND, Json(json!({ "error": "Proxy host not found" })))
        }
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Failed to issue certificate" })),
        ),
    }
}
