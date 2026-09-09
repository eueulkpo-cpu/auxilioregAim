// middleware/rateLimiter.js
// Protecao contra tentativas repetidas de login (forca bruta).
// Combina:
//   1) express-rate-limit -> limite rapido em memoria por IP.
//   2) Registro persistente no SQLite -> sobrevive a reinicios do servidor
//      e permite bloquear tambem por IP mesmo apos deploy/restart.

const rateLimit = require('express-rate-limit');
const db = require('../db');

const MAX_ATTEMPTS = parseInt(process.env.LOGIN_MAX_ATTEMPTS || '5', 10);
const WINDOW_MINUTES = parseInt(process.env.LOGIN_WINDOW_MINUTES || '15', 10);

// Camada 1: limite rapido em memoria (protege contra rajadas)
const loginRateLimiter = rateLimit({
  windowMs: WINDOW_MINUTES * 60 * 1000,
  max: MAX_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: `Muitas tentativas de login. Tente novamente em ${WINDOW_MINUTES} minutos.`
  },
  keyGenerator: (req) => req.ip
});

// Camada 2: verificacao persistente no banco (antes de tentar autenticar)
function checkPersistentLoginAttempts(req, res, next) {
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  const row = db.prepare(`
    SELECT COUNT(*) AS failedCount
    FROM login_attempts
    WHERE ip = ? AND success = 0 AND created_at >= ?
  `).get(req.ip, windowStart);

  if (row.failedCount >= MAX_ATTEMPTS) {
    return res.status(429).json({
      error: `Muitas tentativas de login. Tente novamente em ${WINDOW_MINUTES} minutos.`
    });
  }

  next();
}

function recordLoginAttempt(ip, success) {
  db.prepare(`
    INSERT INTO login_attempts (ip, success) VALUES (?, ?)
  `).run(ip, success ? 1 : 0);
}

// Limpeza periodica de tentativas antigas (mantem a tabela pequena)
function cleanupOldAttempts() {
  const cutoff = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000 * 4).toISOString();
  db.prepare(`DELETE FROM login_attempts WHERE created_at < ?`).run(cutoff);
}
setInterval(cleanupOldAttempts, 60 * 60 * 1000).unref();

module.exports = {
  loginRateLimiter,
  checkPersistentLoginAttempts,
  recordLoginAttempt
};
