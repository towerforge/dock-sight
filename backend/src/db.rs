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
         CREATE INDEX IF NOT EXISTS idx_login_events_created_at ON login_events (created_at DESC);",
    )?;
    Ok(conn)
}
