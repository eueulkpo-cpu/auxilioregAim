// db.js
// Conexao com o banco SQLite (persistente em arquivo) e criacao do schema.

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DATABASE_PATH || './data/keys.db';

// Garante que a pasta do banco existe
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Melhora concorrencia e integridade
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ------------------------------------------------------------------
// Schema
// ------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS keys (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    key         TEXT NOT NULL UNIQUE,
    status      TEXT NOT NULL DEFAULT 'livre'
                CHECK (status IN ('livre', 'ativada', 'expirada', 'revogada')),
    device_id   TEXT DEFAULT NULL,
    duration_label TEXT NOT NULL DEFAULT '30 dias',
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    activated_at TEXT DEFAULT NULL,
    expires_at  TEXT DEFAULT NULL,
    revoked_at  TEXT DEFAULT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_keys_key ON keys(key);
  CREATE INDEX IF NOT EXISTS idx_keys_status ON keys(status);

  -- Registro de tentativas de login (usado pelo rate limiter persistente)
  CREATE TABLE IF NOT EXISTS login_attempts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ip          TEXT NOT NULL,
    success     INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip, created_at);
`);

module.exports = db;
