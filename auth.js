// middleware/auth.js
// Protege rotas exigindo uma sessao de administrador valida.
// A sessao e criada no login (routes/adminAuth.js) e armazenada no lado do
// servidor (express-session), nunca em um token manipulavel pelo cliente.

function requireAdminSession(req, res, next) {
  if (req.session && req.session.isAdmin === true) {
    return next();
  }

  // Se for uma chamada de API (espera JSON), responde com 401 JSON.
  if (req.originalUrl.startsWith('/api/admin') || req.headers.accept === 'application/json') {
    return res.status(401).json({ error: 'Nao autenticado. Faca login novamente.' });
  }

  // Caso contrario, redireciona para a tela de login.
  return res.redirect('/admin/login');
}

module.exports = { requireAdminSession };
