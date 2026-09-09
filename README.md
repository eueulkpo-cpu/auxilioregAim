# Sistema de Gerenciamento de Keys

Sistema completo para gerar, controlar e validar Keys de licenca do seu
aplicativo, com painel administrativo privado e API de ativacao.

Cada Key so pode ser usada em **um unico dispositivo**: ela e vinculada ao
`deviceId` (um ID de instalacao aleatorio, gerado pelo proprio app) no primeiro
uso, e qualquer tentativa de uso em outro dispositivo e recusada.

---

## 1. Estrutura de pastas

```
key-management-system/
├── server.js                       # ponto de entrada do servidor
├── db.js                           # conexao e schema do SQLite
├── package.json
├── .env.example                    # copie para .env
├── data/                           # banco SQLite fica aqui (criado automaticamente)
├── middleware/
│   ├── auth.js                     # exige sessao de admin valida
│   └── rateLimiter.js              # protecao contra forca bruta no login
├── routes/
│   ├── adminAuth.js                # POST /admin/login, /admin/logout
│   ├── adminPage.js                # GET /admin (HTML do dashboard)
│   ├── admin.js                    # /api/admin/keys (CRUD protegido)
│   └── api.js                      # POST /api/keys/activate (API publica)
├── utils/
│   └── keyGenerator.js             # geracao de Keys e calculo de expiracao
├── scripts/
│   └── create-admin.js             # gera hash de senha + session secret
├── public/
│   ├── login.html
│   ├── dashboard.html
│   ├── css/style.css
│   └── js/{login.js, dashboard.js}
└── client-examples/
    ├── javascript-example.js       # integracao para o SEU app (JS)
    └── AndroidKeyActivation.kt     # integracao para o SEU app (Android/Kotlin)
```

---

## 2. Como instalar as dependencias

Pre-requisito: Node.js 18 ou superior.

```bash
cd key-management-system
npm install
```

---

## 3. Configurar variaveis de ambiente

```bash
cp .env.example .env
```

Gere a senha do admin (hash bcrypt) e o segredo de sessao:

```bash
npm run create-admin
```

O comando vai pedir um usuario e uma senha (a senha nao aparece na tela
enquanto voce digita) e vai imprimir algo assim:

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2a$12$Q8x9....(hash longo)....
SESSION_SECRET=8f2a91c3...(string longa aleatoria)...
```

Copie essas 3 linhas para dentro do arquivo `.env` (substituindo os valores
vazios). **Nunca** coloque a senha em texto puro no `.env` -- apenas o hash.

O arquivo `.env` final deve ficar assim (exemplo):

```env
PORT=3000
NODE_ENV=production
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2a$12$Q8x9....
SESSION_SECRET=8f2a91c3....
SESSION_COOKIE_NAME=kms_admin_session
DATABASE_PATH=./data/keys.db
LOGIN_MAX_ATTEMPTS=5
LOGIN_WINDOW_MINUTES=15
```

> Guarde a senha original (nao o hash) em um gerenciador de senhas -- ela nao
> pode ser recuperada a partir do hash.

---

## 4. Como iniciar o servidor

```bash
npm start
```

Voce vera:

```
Servidor rodando na porta 3000
Painel admin: http://localhost:3000/admin/login
```

O arquivo do banco SQLite (`data/keys.db`) e criado automaticamente na
primeira execucao, com o schema ja pronto.

---

## 5. Como colocar a API online

Qualquer provedor que rode Node.js funciona (Railway, Render, Fly.io, VPS
proprio, etc.). Passos gerais:

1. Suba o codigo para o servidor (git push, upload, etc.) **sem o arquivo `.env`**.
2. Configure as variaveis de ambiente diretamente no painel do provedor
   (as mesmas do `.env.example`).
3. Rode `npm install` e depois `npm start` (ou configure o "start command"
   do provedor como `npm start`).
4. Garanta que o dominio final tenha **HTTPS** (a maioria dos provedores
   ja fornece isso automaticamente). Com `NODE_ENV=production`, o cookie
   de sessao so e enviado em conexoes HTTPS.
5. Se estiver atras de um proxy reverso (Nginx, load balancer do provedor),
   isso ja esta configurado no codigo (`app.set('trust proxy', 1)`).

---

## 6. Como acessar o painel administrativo

Acesse:

```
https://SEU-DOMINIO/admin/login
```

Entre com o usuario e a senha (a senha em texto puro que voce definiu no
`npm run create-admin`, nao o hash). Apos autenticado, voce e redirecionado
para `/admin`, o dashboard.

A URL do painel nao gera Keys sozinha: toda rota de `/admin` e `/api/admin/*`
exige uma sessao valida de administrador -- descobrir a URL nao e suficiente
para acessar ou gerar Keys.

---

## 7. Como gerar uma Key

No dashboard:

1. Escolha a validade no seletor: **1 dia, 7 dias, 30 dias, 90 dias ou
   Permanente**.
2. (Opcional) Ajuste a quantidade (gera varias de uma vez, ate 100).
3. Clique em **"Gerar Key"**.
4. A nova Key aparece no topo da lista, com status **Livre**, pronta para
   copiar com o botao **"Copiar"**.

A validade comeca a contar a partir da **ativacao** (primeiro uso pelo app),
nao da criacao -- assim uma Key gerada hoje e usada so daqui a um mes ainda
da os dias completos de acesso ao usuario final.

Via API (equivalente ao botao do dashboard):

```bash
curl -X POST https://SEU-DOMINIO/api/admin/keys \
  -H "Content-Type: application/json" \
  --cookie "kms_admin_session=SEU_COOKIE_DE_SESSAO" \
  -d '{"plan": "30d", "quantity": 1}'
```

---

## 8. Como revogar uma Key

No dashboard, clique em **"Revogar"** na linha da Key desejada e confirme.
Uma Key revogada nunca mais e aceita pela API de ativacao, mesmo que ainda
nao tivesse expirado.

Via API:

```bash
curl -X DELETE https://SEU-DOMINIO/api/admin/keys/KEY-XXXX-XXXX-XXXX-XXXX \
  --cookie "kms_admin_session=SEU_COOKIE_DE_SESSAO"
```

---

## 9. Endpoints da API

### API publica (usada pelo APLICATIVO do usuario final)

**POST `/api/keys/activate`**

Request:
```json
{
  "key": "KEY-8F3A-92KD-71PX-4LMQ",
  "deviceId": "b6f1c2e0-2a3b-4c9d-9e21-2f6a7c8d9e10"
}
```

Respostas possiveis:

Key valida (primeira ativacao ou mesmo dispositivo):
```json
{
  "valid": true,
  "message": "Key ativada com sucesso neste dispositivo.",
  "expiresAt": "2026-12-31T23:59:59.000Z"
}
```

Key inexistente:
```json
{ "valid": false, "message": "Key invalida." }
```

Key revogada:
```json
{ "valid": false, "message": "Esta Key foi revogada." }
```

Key expirada:
```json
{ "valid": false, "message": "Esta Key esta expirada." }
```

Key vinculada a outro dispositivo:
```json
{ "valid": false, "message": "Esta Key ja esta vinculada a outro dispositivo." }
```

### API administrativa (exige sessao de admin -- cookie httpOnly)

| Metodo | Rota                              | Descricao                          |
|--------|------------------------------------|-------------------------------------|
| POST   | `/api/admin/keys`                 | Gera 1 ou mais novas Keys           |
| GET    | `/api/admin/keys?search=&status=` | Lista/pesquisa/filtra Keys          |
| DELETE | `/api/admin/keys/:key`            | Revoga uma Key                      |
| PATCH  | `/api/admin/keys/:key/reactivate` | Reativa uma Key (volta a "livre")   |
| DELETE | `/api/admin/keys/:key/permanent`  | Exclui a Key definitivamente        |

---

## 10. Como integrar a API ao seu aplicativo

Veja os arquivos prontos em `client-examples/`:

- **`javascript-example.js`** -- para apps em JavaScript/Electron/webview.
- **`AndroidKeyActivation.kt`** -- para apps Android nativos em Kotlin.

Ambos ja implementam o fluxo completo:

1. Geram um `deviceId` aleatorio (UUID v4) na primeira instalacao.
2. Salvam esse `deviceId` localmente (nunca usam IMEI, numero de serie,
   MAC Address ou qualquer identificador sensivel de hardware).
3. Pedem a Key ao usuario.
4. Enviam Key + deviceId para `/api/keys/activate`.
5. Liberam o acesso somente quando `valid === true`.
6. Mostram a mensagem de erro adequada quando a Key e invalida, expirada,
   revogada, ou pertence a outro dispositivo.

Basta trocar `API_BASE_URL` pela URL real do seu servidor em producao.

---

## 11. Notas de seguranca

- A senha do admin nunca fica no JavaScript do navegador nem no codigo-fonte:
  apenas o **hash bcrypt** fica na variavel de ambiente `ADMIN_PASSWORD_HASH`,
  comparado inteiramente no servidor.
- A sessao do admin usa um cookie `httpOnly` (inacessivel via JS do navegador)
  e `secure` em producao (exige HTTPS).
- Login tem **duas camadas de rate limiting**: uma em memoria
  (`express-rate-limit`) e outra persistida no banco (sobrevive a reinicios
  do servidor), configuraveis via `LOGIN_MAX_ATTEMPTS` e `LOGIN_WINDOW_MINUTES`.
- Toda rota de `/admin` (pagina) e `/api/admin/*` (API) exige sessao valida --
  conhecer a URL sozinho nao concede acesso.
- Cabecalhos de seguranca basicos via `helmet` (CSP, etc.).
- O `deviceId` usado pela API e um identificador aleatorio gerado pelo
  proprio app, nunca um identificador sensivel do aparelho.

## 12. Limitacoes conhecidas / proximos passos sugeridos

- A sessao usa o MemoryStore padrao do `express-session`, adequado para uma
  unica instancia do servidor. Se voce for rodar multiplas instancias atras
  de um load balancer, troque por um store compartilhado (ex: `connect-sqlite3`
  ou `connect-redis`).
- Nao ha rotacao automatica da `SESSION_SECRET`; se precisar invalidar todas
  as sessoes de uma vez, basta trocar o valor no `.env` e reiniciar o servidor.
- Para ambientes de alta escala, considere migrar de SQLite para PostgreSQL
  (o codigo em `db.js` e o unico ponto que precisaria mudar).
