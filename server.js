// server.js
// Ponto de entrada do sistema de gerenciamento de Keys.

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const path = require('path');

const { requireAdminSession } = require('./middleware/auth');
const adminAuthRoutes = require('./routes/adminAuth');
const adminPageRoutes = require('./routes/adminPage');
const adminApiRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');

// Validacao minima de configuracao antes de subir o servidor
const requiredEnvVars = ['ADMIN_USERNAME', 'ADMIN_PASSWORD_HASH', 'SESSION_SECRET'];
const missing = requiredEnvVars.filter((v) => !process.env[v]);
if (missing.length > 0) {
  console.error(
    `\nERRO: variaveis de ambiente obrigatorias ausentes: ${missing.join(', ')}\n` +
    'Copie ".env.example" para ".env" e preencha os valores antes de iniciar o servidor.\n' +
    'Para gerar ADMIN_PASSWORD_HASH e SESSION_SECRET, rode: npm run create-admin\n'
  );
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Necessario quando o app roda atras de um proxy reverso (Render, Railway,
// Nginx, etc.) para que "req.ip" e cookies "secure" funcionem corretamente.
app.set('trust proxy', 1);

// Cabecalhos de seguranca basicos
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:']
    }
  }
}));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Sessao do administrador: guardada no lado do servidor (memory store aqui;
// para producao com multiplas instancias, troque por um store como
// connect-sqlite3 ou connect-redis).
app.use(session({
  name: process.env.SESSION_COOKIE_NAME || 'kms_admin_session',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,        // nao acessivel via JavaScript do navegador
    secure: isProduction,  // exige HTTPS em producao
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000 // 8 horas
  }
}));

// Arquivos estaticos do painel (CSS/JS do dashboard).
// Observacao: login.html e dashboard.html sao servidos manualmente pelas
// rotas abaixo (nao aqui), para que dashboard.html exija sessao valida.
app.use('/admin/static', express.static(path.join(__dirname, 'public'), { index: false }));

// ------------------------------------------------------------------
// Rotas
// ------------------------------------------------------------------

// Login/logout do admin (sem exigir sessao previa, obviamente)
app.use('/admin', adminAuthRoutes);

// Pagina HTML do painel (GET /admin) -- exige sessao valida
app.use('/admin', adminPageRoutes);

// API administrativa (GET/POST/DELETE /api/admin/keys...) -- exige sessao valida
app.use('/api/admin', requireAdminSession, adminApiRoutes);

// API publica usada pelo aplicativo do usuario final
app.use('/api', apiRoutes);

// Raiz -> manda para o login (nao expõe nada publicamente)
app.get('/', (req, res) => {
  res.redirect('/admin/login');
});

// 404 padrao
app.use((req, res) => {
  res.status(404).json({ error: 'Rota nao encontrada.' });
});

// Handler de erro generico (evita vazar stack trace para o cliente)
app.use((err, req, res, next) => {
  console.error('Erro nao tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Painel admin: http://localhost:${PORT}/admin/login`);
});
