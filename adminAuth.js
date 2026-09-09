// routes/adminAuth.js
// Login e logout do administrador. A senha NUNCA fica no JS do navegador:
// o hash bcrypt fica apenas na variavel de ambiente ADMIN_PASSWORD_HASH,
// lido e comparado inteiramente no servidor.

const express = require('express');
const bcrypt = require('bcryptjs');
const path = require('path');
const {
  loginRateLimiter,
  checkPersistentLoginAttempts,
  recordLoginAttempt
} = require('../middleware/rateLimiter');

const router = express.Router();

// Pagina de login (HTML estatico, sem nenhum segredo embutido)
router.get('/login', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/admin');
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

// Processa o login
router.post('/login', loginRateLimiter, checkPersistentLoginAttempts, async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario e senha sao obrigatorios.' });
    }

    const expectedUsername = process.env.ADMIN_USERNAME;
    const expectedHash = process.env.ADMIN_PASSWORD_HASH;

    if (!expectedUsername || !expectedHash) {
      console.error('ADMIN_USERNAME ou ADMIN_PASSWORD_HASH nao configurados no .env');
      return res.status(500).json({ error: 'Configuracao do servidor incompleta.' });
    }

    // Comparacao do usuario feita de forma simples (nao e segredo sensivel a timing
    // da mesma forma que a senha), a senha e sempre validada via bcrypt.compare.
    const usernameMatches = username === expectedUsername;
    const passwordMatches = await bcrypt.compare(password, expectedHash);

    if (!usernameMatches || !passwordMatches) {
      recordLoginAttempt(req.ip, false);
      return res.status(401).json({ error: 'Usuario ou senha invalidos.' });
    }

    recordLoginAttempt(req.ip, true);

    // Regenera a sessao para evitar session fixation
    req.session.regenerate((err) => {
      if (err) {
        console.error('Erro ao regenerar sessao:', err);
        return res.status(500).json({ error: 'Erro interno ao criar sessao.' });
      }
      req.session.isAdmin = true;
      req.session.username = username;
      return res.json({ success: true, redirectTo: '/admin' });
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erro ao destruir sessao:', err);
      return res.status(500).json({ error: 'Erro ao encerrar sessao.' });
    }
    res.clearCookie(process.env.SESSION_COOKIE_NAME || 'kms_admin_session');
    res.json({ success: true, redirectTo: '/admin/login' });
  });
});

module.exports = router;
