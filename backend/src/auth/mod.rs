use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, SystemTime};
use tokio::sync::Mutex;
use serde::{Deserialize, Serialize};

const RATE_LIMIT_MAX_ATTEMPTS: u32 = 10;
const RATE_LIMIT_WINDOW: Duration = Duration::from_secs(15 * 60);

pub mod middleware;
pub mod routes;

#[derive(Serialize, Deserialize, Clone)]
pub struct Registry {
    pub id:       String,
    pub name:     String,
    pub provider: String,
    pub username: String,
    pub token:    String,
}

#[derive(Serialize, Deserialize, Default, Clone)]
pub struct AuthConfig {
    pub password_hash: Option<String>,
    #[serde(default)]
    pub registries: Vec<Registry>,
}

#[derive(Clone)]
pub struct AuthState {
    pub config: Arc<Mutex<AuthConfig>>,
    pub sessions: Arc<Mutex<HashMap<String, SystemTime>>>,
    pub session_duration: Duration,
    pub data_dir: PathBuf,
    pub secure_cookies: bool,
    pub login_attempts: Arc<Mutex<HashMap<String, (u32, SystemTime)>>>,
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

        let config = Self::load_config_from(&data_dir);

        let secure_cookies = std::env::var("SECURE_COOKIES")
            .map(|v| v == "true" || v == "1")
            .unwrap_or(false);

        Self {
            config: Arc::new(Mutex::new(config)),
            sessions: Arc::new(Mutex::new(HashMap::new())),
            session_duration: Duration::from_secs(session_hours * 3600),
            data_dir,
            secure_cookies,
            login_attempts: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    fn load_config_from(data_dir: &PathBuf) -> AuthConfig {
        let path = data_dir.join("config.json");
        if path.exists() {
            if let Ok(content) = std::fs::read_to_string(&path) {
                if let Ok(config) = serde_json::from_str(&content) {
                    return config;
                }
            }
        }
        AuthConfig::default()
    }

    pub async fn save_config(&self) {
        let config = self.config.lock().await;
        let path = self.data_dir.join("config.json");
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        if let Ok(content) = serde_json::to_string(&*config) {
            let _ = std::fs::write(path, content);
        }
    }

    pub async fn is_session_valid(&self, token: &str) -> bool {
        let mut sessions = self.sessions.lock().await;
        match sessions.get(token) {
            Some(expiry) if SystemTime::now() < *expiry => true,
            Some(_) => {
                sessions.remove(token);
                false
            }
            None => false,
        }
    }

    pub async fn create_session(&self) -> String {
        let token = uuid::Uuid::new_v4().to_string();
        let expiry = SystemTime::now() + self.session_duration;
        self.sessions.lock().await.insert(token.clone(), expiry);
        token
    }

    pub async fn remove_session(&self, token: &str) {
        self.sessions.lock().await.remove(token);
    }

    pub async fn check_rate_limit(&self, ip: &str) -> bool {
        let attempts = self.login_attempts.lock().await;
        if let Some((count, window_start)) = attempts.get(ip) {
            let elapsed = SystemTime::now().duration_since(*window_start).unwrap_or(RATE_LIMIT_WINDOW);
            if elapsed < RATE_LIMIT_WINDOW {
                return *count < RATE_LIMIT_MAX_ATTEMPTS;
            }
        }
        true
    }

    pub async fn record_failed_attempt(&self, ip: &str) {
        let mut attempts = self.login_attempts.lock().await;
        let entry = attempts.entry(ip.to_string()).or_insert((0, SystemTime::now()));
        let elapsed = SystemTime::now().duration_since(entry.1).unwrap_or(RATE_LIMIT_WINDOW);
        if elapsed >= RATE_LIMIT_WINDOW {
            *entry = (1, SystemTime::now());
        } else {
            entry.0 += 1;
        }
    }

    pub async fn clear_attempts(&self, ip: &str) {
        self.login_attempts.lock().await.remove(ip);
    }

    pub fn session_cookie(&self, token: &str, max_age: u64) -> String {
        let secure = if self.secure_cookies { "; Secure" } else { "" };
        format!(
            "dock_sight_session={}; HttpOnly; SameSite=Lax; Max-Age={}; Path=/{}",
            token, max_age, secure
        )
    }
}
