// routes/adminPage.js
// Serve a pagina HTML do painel (o conteudo dinamico e carregado via fetch
// para /api/admin/keys, autenticado por cookie de sessao httpOnly).

const express = require('express');
const path = require('path');
const { requireAdminSession } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAdminSession, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});

module.exports = router;
