// routes/admin.js
// Endpoints administrativos protegidos (exigem sessao de admin valida,
// aplicada globalmente em server.js com requireAdminSession).

const express = require('express');
const db = require('../db');
const { requireAdminSession } = require('../middleware/auth');
const {
  generateKey,
  isValidPlan,
  getPlanLabel
} = require('../utils/keyGenerator');

const router = express.Router();

// ------------------------------------------------------------------
// POST /api/admin/keys  -> gera uma ou mais novas Keys
// body: { plan: "1d" | "7d" | "30d" | "90d" | "permanent", quantity?: number }
// ------------------------------------------------------------------
router.post('/keys', requireAdminSession, (req, res) => {
  const { plan, quantity } = req.body || {};

  if (!plan || !isValidPlan(plan)) {
    return res.status(400).json({
      error: 'Plano de validade invalido. Use: 1d, 7d, 30d, 90d ou permanent.'
    });
  }

  const qty = Math.min(Math.max(parseInt(quantity, 10) || 1, 1), 100); // limite de seguranca: 100 por vez
  const insert = db.prepare(`
    INSERT INTO keys (key, status, duration_label)
    VALUES (?, 'livre', ?)
  `);

  const createdKeys = [];
  const insertMany = db.transaction((count) => {
    for (let i = 0; i < count; i++) {
      let key;
      let attempts = 0;
      // Garante unicidade mesmo no improvavel caso de colisao
      while (true) {
        key = generateKey();
        attempts++;
        const exists = db.prepare('SELECT 1 FROM keys WHERE key = ?').get(key);
        if (!exists || attempts > 5) break;
      }
      insert.run(key, getPlanLabel(plan));
      createdKeys.push(key);
    }
  });

  insertMany(qty);

  const rows = db.prepare(`
    SELECT * FROM keys WHERE key IN (${createdKeys.map(() => '?').join(',')})
  `).all(...createdKeys);

  res.status(201).json({ created: rows.length, keys: rows });
});

// ------------------------------------------------------------------
// GET /api/admin/keys -> lista todas as Keys (com filtro/busca opcional)
// query params: ?search=texto  &status=livre|ativada|expirada|revogada
// ------------------------------------------------------------------
router.get('/keys', requireAdminSession, (req, res) => {
  const { search, status } = req.query;

  // Antes de listar, atualiza status de Keys cujo prazo ja passou
  markExpiredKeys();

  let query = 'SELECT * FROM keys WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND key LIKE ?';
    params.push(`%${search.trim().toUpperCase()}%`);
  }

  if (status && ['livre', 'ativada', 'expirada', 'revogada'].includes(status)) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const rows = db.prepare(query).all(...params);

  const counts = db.prepare(`
    SELECT status, COUNT(*) AS total FROM keys GROUP BY status
  `).all();

  const countsMap = { livre: 0, ativada: 0, expirada: 0, revogada: 0 };
  counts.forEach((c) => { countsMap[c.status] = c.total; });

  res.json({ keys: rows, counts: countsMap, total: rows.length });
});

// ------------------------------------------------------------------
// DELETE /api/admin/keys/:key -> revoga a Key (nao apaga o historico)
// ------------------------------------------------------------------
router.delete('/keys/:key', requireAdminSession, (req, res) => {
  const key = String(req.params.key || '').toUpperCase();

  const existing = db.prepare('SELECT * FROM keys WHERE key = ?').get(key);
  if (!existing) {
    return res.status(404).json({ error: 'Key nao encontrada.' });
  }

  if (existing.status === 'revogada') {
    return res.status(400).json({ error: 'Esta Key ja esta revogada.' });
  }

  db.prepare(`
    UPDATE keys
    SET status = 'revogada', revoked_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE key = ?
  `).run(key);

  const updated = db.prepare('SELECT * FROM keys WHERE key = ?').get(key);
  res.json({ success: true, key: updated });
});

// ------------------------------------------------------------------
// PATCH /api/admin/keys/:key/reactivate -> reativa uma Key revogada
// (volta para "livre", limpando o device_id, para permitir reuso)
// ------------------------------------------------------------------
router.patch('/keys/:key/reactivate', requireAdminSession, (req, res) => {
  const key = String(req.params.key || '').toUpperCase();

  const existing = db.prepare('SELECT * FROM keys WHERE key = ?').get(key);
  if (!existing) {
    return res.status(404).json({ error: 'Key nao encontrada.' });
  }

  db.prepare(`
    UPDATE keys
    SET status = 'livre', device_id = NULL, activated_at = NULL,
        expires_at = NULL, revoked_at = NULL
    WHERE key = ?
  `).run(key);

  const updated = db.prepare('SELECT * FROM keys WHERE key = ?').get(key);
  res.json({ success: true, key: updated });
});

// ------------------------------------------------------------------
// DELETE /api/admin/keys/:key/permanent -> exclui definitivamente do banco
// ------------------------------------------------------------------
router.delete('/keys/:key/permanent', requireAdminSession, (req, res) => {
  const key = String(req.params.key || '').toUpperCase();
  const result = db.prepare('DELETE FROM keys WHERE key = ?').run(key);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Key nao encontrada.' });
  }

  res.json({ success: true, deleted: key });
});

// ------------------------------------------------------------------
// Helper: marca como "expirada" toda Key ativada cujo expires_at passou
// ------------------------------------------------------------------
function markExpiredKeys() {
  db.prepare(`
    UPDATE keys
    SET status = 'expirada'
    WHERE status = 'ativada'
      AND expires_at IS NOT NULL
      AND expires_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  `).run();
}

module.exports = router;
