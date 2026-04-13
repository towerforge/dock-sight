use rusqlite::{Connection, Result};
use std::path::Path;

pub fn open(data_dir: &Path) -> Result<Connection> {
    let _ = std::fs::create_dir_all(data_dir);
    let conn = Connection::open(data_dir.join("dock-sight.db"))?;
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous  = NORMAL;
         PRAGMA foreign_keys = ON;

         CREATE TABLE IF NOT EXISTS registries (
             id       TEXT PRIMARY KEY,
             name     TEXT NOT NULL,
             provider TEXT NOT NULL,
             username TEXT NOT NULL,
             token    TEXT NOT NULL
         );

         CREATE TABLE IF NOT EXISTS users (
             id            TEXT PRIMARY KEY,
             username      TEXT UNIQUE NOT NULL COLLATE NOCASE,
             password_hash TEXT NOT NULL,
             created_at    INTEGER NOT NULL DEFAULT (unixepoch())
         );

         CREATE TABLE IF NOT EXISTS login_attempts (
             ip         TEXT NOT NULL PRIMARY KEY,
             attempts   INTEGER NOT NULL DEFAULT 0,
             reset_at   INTEGER NOT NULL,
             updated_at INTEGER NOT NULL DEFAULT (unixepoch())
         );

         CREATE TABLE IF NOT EXISTS login_events (
             id         INTEGER PRIMARY KEY AUTOINCREMENT,
             ip         TEXT NOT NULL,
             username   TEXT,
             blocked    INTEGER NOT NULL DEFAULT 0,
             created_at INTEGER NOT NULL DEFAULT (unixepoch())
         );
         CREATE INDEX IF NOT EXISTS idx_login_events_ip         ON login_events (ip);
         CREATE INDEX IF NOT EXISTS idx_login_events_created_at ON login_events (created_at DESC);

         CREATE TABLE IF NOT EXISTS settings (
             key   TEXT PRIMARY KEY,
             value TEXT NOT NULL
         );",
    )?;

    // ── Proxy tables ──────────────────────────────────────────────────────────
    // Version 2: TEXT UUID primary key + custom_config column.
    // On first run or stale schema, drop old tables and recreate from scratch.
    let proxy_version: i64 = conn
        .query_row(
            "SELECT CAST(value AS INTEGER) FROM settings WHERE key = 'proxy_schema_version'",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    if proxy_version < 2 {
        conn.execute_batch(
            "PRAGMA foreign_keys = OFF;
             DROP TABLE IF EXISTS ssl_certificates;
             DROP TABLE IF EXISTS proxy_hosts;
             PRAGMA foreign_keys = ON;

             CREATE TABLE proxy_hosts (
                 id            TEXT    PRIMARY KEY,
                 domain        TEXT    NOT NULL UNIQUE,
                 target_url    TEXT    NOT NULL,
                 ssl_mode      TEXT    NOT NULL DEFAULT 'none',
                 force_https   INTEGER NOT NULL DEFAULT 0,
                 enabled       INTEGER NOT NULL DEFAULT 1,
                 custom_config TEXT    NOT NULL DEFAULT '',
                 created_at    INTEGER NOT NULL DEFAULT (unixepoch())
             );

             CREATE TABLE ssl_certificates (
                 id         TEXT    PRIMARY KEY,
                 host_id    TEXT    NOT NULL UNIQUE REFERENCES proxy_hosts(id) ON DELETE CASCADE,
                 cert_pem   TEXT    NOT NULL DEFAULT '',
                 key_pem    TEXT    NOT NULL DEFAULT '',
                 expires_at INTEGER NOT NULL,
                 renewed_at INTEGER NOT NULL DEFAULT (unixepoch())
             );",
        )?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('proxy_schema_version', '2')",
            [],
        )?;
    } else {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS proxy_hosts (
                 id            TEXT    PRIMARY KEY,
                 domain        TEXT    NOT NULL UNIQUE,
                 target_url    TEXT    NOT NULL,
                 ssl_mode      TEXT    NOT NULL DEFAULT 'none',
                 force_https   INTEGER NOT NULL DEFAULT 0,
                 enabled       INTEGER NOT NULL DEFAULT 1,
                 custom_config TEXT    NOT NULL DEFAULT '',
                 created_at    INTEGER NOT NULL DEFAULT (unixepoch())
             );

             CREATE TABLE IF NOT EXISTS ssl_certificates (
                 id         TEXT    PRIMARY KEY,
                 host_id    TEXT    NOT NULL UNIQUE REFERENCES proxy_hosts(id) ON DELETE CASCADE,
                 cert_pem   TEXT    NOT NULL DEFAULT '',
                 key_pem    TEXT    NOT NULL DEFAULT '',
                 expires_at INTEGER NOT NULL,
                 renewed_at INTEGER NOT NULL DEFAULT (unixepoch())
             );",
        )?;
    }

    Ok(conn)
}
