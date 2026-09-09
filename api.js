// routes/api.js
// API publica consumida pelo APLICATIVO do usuario (nao pelo painel admin).
// Endpoint principal: POST /api/keys/activate

const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { calculateExpiresAt } = require('../utils/keyGenerator');

const router = express.Router();

// Rate limit generico para evitar abuso/forca-bruta de Keys por tentativa e erro
const activateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30, // 30 tentativas por IP a cada 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { valid: false, message: 'Muitas tentativas. Tente novamente mais tarde.' }
});

function normalizeKey(rawKey) {
  return String(rawKey || '').trim().toUpperCase();
}

function isExpired(row) {
  if (!row.expires_at) return false; // permanente
  return new Date(row.expires_at).getTime() <= Date.now();
}

// ------------------------------------------------------------------
// POST /api/keys/activate
// body: { key: "KEY-XXXX-XXXX-XXXX-XXXX", deviceId: "uuid-do-dispositivo" }
// ------------------------------------------------------------------
router.post('/keys/activate', activateLimiter, (req, res) => {
  const key = normalizeKey(req.body && req.body.key);
  const deviceId = String((req.body && req.body.deviceId) || '').trim();

  if (!key || !deviceId) {
    return res.status(400).json({
      valid: false,
      message: 'Campos "key" e "deviceId" sao obrigatorios.'
    });
  }

  // 1. A Key existe?
  const row = db.prepare('SELECT * FROM keys WHERE key = ?').get(key);
  if (!row) {
    return res.status(404).json({ valid: false, message: 'Key invalida.' });
  }

  // 2. Esta revogada?
  if (row.status === 'revogada') {
    return res.status(403).json({ valid: false, message: 'Esta Key foi revogada.' });
  }

  // 3. Ja estava marcada como expirada, ou o prazo estourou agora?
  if (row.status === 'expirada' || (row.status === 'ativada' && isExpired(row))) {
    if (row.status !== 'expirada') {
      db.prepare(`UPDATE keys SET status = 'expirada' WHERE key = ?`).run(key);
    }
    return res.status(403).json({ valid: false, message: 'Esta Key esta expirada.' });
  }

  // 4. Esta livre -> vincula a este deviceId agora (primeira ativacao)
  if (row.status === 'livre') {
    const now = new Date();
    const expiresAt = calculateExpiresAt(planCodeFromLabel(row.duration_label), now);

    db.prepare(`
      UPDATE keys
      SET status = 'ativada',
          device_id = ?,
          activated_at = ?,
          expires_at = ?
      WHERE key = ?
    `).run(deviceId, now.toISOString(), expiresAt, key);

    return res.json({
      valid: true,
      message: 'Key ativada com sucesso neste dispositivo.',
      expiresAt: expiresAt // null quando o plano e permanente
    });
  }

  // 5. Ja esta ativada -> so permite se for o MESMO deviceId
  if (row.status === 'ativada') {
    if (row.device_id === deviceId) {
      return res.json({
        valid: true,
        message: 'Key valida.',
        expiresAt: row.expires_at
      });
    }
    // 6. Vinculada a outro dispositivo -> nega
    return res.status(403).json({
      valid: false,
      message: 'Esta Key ja esta vinculada a outro dispositivo.'
    });
  }

  // Fallback de seguranca (nao deveria chegar aqui)
  return res.status(400).json({ valid: false, message: 'Nao foi possivel validar a Key.' });
});

// Traduz o "duration_label" salvo (ex: "30 dias") de volta para o codigo do
// plano usado por calculateExpiresAt. Guardamos o label ao inves do codigo
// para facilitar a leitura direta no painel admin.
function planCodeFromLabel(label) {
  const map = {
    '1 dia': '1d',
    '7 dias': '7d',
    '30 dias': '30d',
    '90 dias': '90d',
    'Permanente': 'permanent'
  };
  return map[label] || '30d';
}

module.exports = router;
