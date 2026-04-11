use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::sync::Mutex;
use serde::{Deserialize, Serialize};

pub const RATE_LIMIT_MAX_ATTEMPTS: u32 = 10;
pub const RATE_LIMIT_WINDOW_SECS:  i64 = 15 * 60;

pub mod middleware;
pub mod routes;

// ── Domain types ─────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone)]
pub struct Registry {
    pub id:       String,
    pub name:     String,
    pub provider: String,
    pub username: String,
    pub token:    String,
}

#[derive(Default, Clone)]
pub struct AuthConfig {
    pub registries: Vec<Registry>,
}

// ── AuthState ────────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct AuthState {
    pub config:              Arc<Mutex<AuthConfig>>,
    /// token → (user_id, expiry)
    pub sessions:            Arc<Mutex<HashMap<String, (String, SystemTime)>>>,
    pub session_duration:    Duration,
    pub db:                  Arc<std::sync::Mutex<rusqlite::Connection>>,
    pub setup_done:          Arc<AtomicBool>,
    pub secure_cookies:      bool,
    pub rate_limit_enabled:  Arc<AtomicBool>,
}

impl AuthState {
    pub fn new() -> Self {
        let data_dir = std::env::var("DATA_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("."));

        let session_hours: u64 = std::env::var("SESSION_DURATION_HOURS")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(24);

        let secure_cookies = std::env::var("SECURE_COOKIES")
            .map(|v| v == "true" || v == "1")
            .unwrap_or(false);

        let conn               = crate::db::open(&data_dir).expect("Failed to open database");
        let config             = Self::load_config(&conn, &data_dir);
        let setup_done         = Self::check_setup_done(&conn);
        let rate_limit_enabled = Self::load_bool_setting(&conn, "rate_limit_enabled", true);

        Self {
            config:             Arc::new(Mutex::new(config)),
            sessions:           Arc::new(Mutex::new(HashMap::new())),
            session_duration:   Duration::from_secs(session_hours * 3600),
            db:                 Arc::new(std::sync::Mutex::new(conn)),
            setup_done:         Arc::new(AtomicBool::new(setup_done)),
            secure_cookies,
            rate_limit_enabled: Arc::new(AtomicBool::new(rate_limit_enabled)),
        }
    }

    fn check_setup_done(conn: &rusqlite::Connection) -> bool {
        conn.query_row("SELECT COUNT(*) FROM users", [], |r| r.get::<_, i64>(0))
            .unwrap_or(0) > 0
    }

    fn load_bool_setting(conn: &rusqlite::Connection, key: &str, default: bool) -> bool {
        conn.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            [key],
            |r| r.get::<_, String>(0),
        )
        .ok()
        .map(|v| v == "true" || v == "1")
        .unwrap_or(default)
    }

    fn load_config(conn: &rusqlite::Connection, _data_dir: &PathBuf) -> AuthConfig {
        let mut stmt = conn
            .prepare("SELECT id, name, provider, username, token FROM registries")
            .unwrap();
        let registries: Vec<Registry> = stmt
            .query_map([], |row| {
                Ok(Registry {
                    id:       row.get(0)?,
                    name:     row.get(1)?,
                    provider: row.get(2)?,
                    username: row.get(3)?,
                    token:    row.get(4)?,
                })
            })
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        AuthConfig { registries }
    }

    // ── Persistence ───────────────────────────────────────────────────────────

    pub async fn save_config(&self) {
        let config = self.config.lock().await.clone();
        let db = self.db.clone();
        tokio::task::spawn_blocking(move || {
            let conn = db.lock().unwrap();
            let _ = conn.execute("DELETE FROM registries", []);
            for r in &config.registries {
                let _ = conn.execute(
                    "INSERT INTO registries (id, name, provider, username, token) VALUES (?1, ?2, ?3, ?4, ?5)",
                    [&r.id, &r.name, &r.provider, &r.username, &r.token],
                );
            }
        })
        .await
        .ok();
    }

    // ── Session management ────────────────────────────────────────────────────

    pub async fn create_session_for(&self, user_id: String) -> String {
        let token  = uuid::Uuid::new_v4().to_string();
        let expiry = SystemTime::now() + self.session_duration;
        self.sessions.lock().await.insert(token.clone(), (user_id, expiry));
        token
    }

    pub async fn get_session_user_id(&self, token: &str) -> Option<String> {
        let mut sessions = self.sessions.lock().await;
        match sessions.get(token) {
            Some((user_id, expiry)) if SystemTime::now() < *expiry => Some(user_id.clone()),
            Some(_) => { sessions.remove(token); None }
            None => None,
        }
    }

    pub async fn is_session_valid(&self, token: &str) -> bool {
        self.get_session_user_id(token).await.is_some()
    }

    pub async fn remove_session(&self, token: &str) {
        self.sessions.lock().await.remove(token);
    }

    // ── Login event log ───────────────────────────────────────────────────────

    pub async fn record_login_event(&self, ip: String, username: Option<String>, blocked: bool) {
        let db = self.db.clone();
        tokio::task::spawn_blocking(move || {
            let conn = db.lock().unwrap();
            let _ = conn.execute(
                "INSERT INTO login_events (ip, username, blocked) VALUES (?1, ?2, ?3)",
                rusqlite::params![ip, username, blocked as i32],
            );
        })
        .await
        .ok();
    }

    // ── Rate limiting (DB-backed, persists across restarts) ───────────────────

    pub fn now_secs() -> i64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64
    }

    /// Returns `true` if the request should be allowed (not yet blocked).
    pub async fn check_rate_limit(&self, ip: &str) -> bool {
        if !self.rate_limit_enabled.load(Ordering::Relaxed) {
            return true;
        }
        let db  = self.db.clone();
        let ip  = ip.to_string();
        let now = Self::now_secs();
        tokio::task::spawn_blocking(move || {
            let conn = db.lock().unwrap();
            let row: Option<(i64, i64)> = conn.query_row(
                "SELECT attempts, reset_at FROM login_attempts WHERE ip = ?1",
                [&ip],
                |r| Ok((r.get(0)?, r.get(1)?)),
            ).ok();
            match row {
                None => true,
                Some((_, reset_at)) if now >= reset_at => true, // window expired
                Some((attempts, _)) => (attempts as u32) < RATE_LIMIT_MAX_ATTEMPTS,
            }
        })
        .await
        .unwrap_or(true)
    }

    /// Increments the failed-attempt counter for `ip`. Opens a new window if expired.
    pub async fn record_failed_attempt(&self, ip: &str) {
        let db      = self.db.clone();
        let ip      = ip.to_string();
        let now     = Self::now_secs();
        let reset_at = now + RATE_LIMIT_WINDOW_SECS;
        tokio::task::spawn_blocking(move || {
            let conn = db.lock().unwrap();
            // If a row exists and the window hasn't expired → increment.
            // Otherwise start fresh.
            let existing: Option<i64> = conn.query_row(
                "SELECT reset_at FROM login_attempts WHERE ip = ?1",
                [&ip],
                |r| r.get(0),
            ).ok();
            match existing {
                Some(existing_reset) if now < existing_reset => {
                    let _ = conn.execute(
                        "UPDATE login_attempts SET attempts = attempts + 1, updated_at = ?1 WHERE ip = ?2",
                        rusqlite::params![now, ip],
                    );
                }
                _ => {
                    let _ = conn.execute(
                        "INSERT INTO login_attempts (ip, attempts, reset_at, updated_at) \
                         VALUES (?1, 1, ?2, ?3) \
                         ON CONFLICT(ip) DO UPDATE SET attempts = 1, reset_at = ?2, updated_at = ?3",
                        rusqlite::params![ip, reset_at, now],
                    );
                }
            }
        })
        .await
        .ok();
    }

    /// Enables or disables brute-force rate limiting and persists the setting.
    pub async fn set_rate_limit_enabled(&self, enabled: bool) {
        self.rate_limit_enabled.store(enabled, Ordering::Relaxed);
        let db    = self.db.clone();
        let value = if enabled { "true" } else { "false" };
        tokio::task::spawn_blocking(move || {
            let conn = db.lock().unwrap();
            let _ = conn.execute(
                "INSERT INTO settings (key, value) VALUES ('rate_limit_enabled', ?1) \
                 ON CONFLICT(key) DO UPDATE SET value = ?1",
                [value],
            );
        })
        .await
        .ok();
    }

    /// Clears the rate-limit record for `ip` (called after a successful login).
    pub async fn clear_attempts(&self, ip: &str) {
        let db = self.db.clone();
        let ip = ip.to_string();
        tokio::task::spawn_blocking(move || {
            let conn = db.lock().unwrap();
            let _ = conn.execute("DELETE FROM login_attempts WHERE ip = ?1", [&ip]);
        })
        .await
        .ok();
    }

    // ── Cookie helpers ────────────────────────────────────────────────────────

    pub fn session_cookie(&self, token: &str, max_age: u64) -> String {
        let secure = if self.secure_cookies { "; Secure" } else { "" };
        format!(
            "dock_sight_session={}; HttpOnly; SameSite=Lax; Max-Age={}; Path=/{}",
            token, max_age, secure
        )
    }
}
