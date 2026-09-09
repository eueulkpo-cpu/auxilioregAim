/**
 * client-examples/javascript-example.js
 *
 * Exemplo pronto de integracao para o SEU APLICATIVO (nao para o painel admin).
 * Funciona em Node.js (Electron, apps desktop) ou adaptado para o navegador
 * (troque localStorage por outro storage se necessario).
 *
 * Fluxo:
 *  1. Gera um deviceId aleatorio na primeira execucao e salva localmente.
 *  2. Pede a Key ao usuario (uma unica vez, ou sempre que necessario).
 *  3. Envia Key + deviceId para a API.
 *  4. Libera ou bloqueia o acesso de acordo com a resposta.
 */

// -----------------------------------------------------------------------
// CONFIGURACAO -- troque pela URL real do seu servidor
// -----------------------------------------------------------------------
const API_BASE_URL = 'https://seu-servidor.com'; // <-- ajuste aqui

// -----------------------------------------------------------------------
// 1. Geracao/leitura do deviceId (ID de instalacao aleatorio, NAO sensivel)
// -----------------------------------------------------------------------

// Exemplo para ambiente com "localStorage" (Electron / navegador / webview)
function getOrCreateDeviceId() {
  const STORAGE_KEY = 'app_device_id';
  let deviceId = localStorage.getItem(STORAGE_KEY);

  if (!deviceId) {
    deviceId = generateUuidV4();
    localStorage.setItem(STORAGE_KEY, deviceId);
  }

  return deviceId;
}

// Gerador de UUID v4 simples, sem dependencias externas.
// Usa crypto.getRandomValues quando disponivel (navegador/Electron),
// com fallback para Math.random (apenas para ambientes sem Web Crypto).
function generateUuidV4() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : ('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx').replace(/[xy]/g, (c) => {
          const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
  }
  // Fallback (ambientes muito antigos / Node sem webcrypto)
  return ('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx').replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// -----------------------------------------------------------------------
// 2 e 3. Envia a Key + deviceId para a API de ativacao
// -----------------------------------------------------------------------
async function activateLicenseKey(key) {
  const deviceId = getOrCreateDeviceId();

  try {
    const response = await fetch(`${API_BASE_URL}/api/keys/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, deviceId })
    });

    const data = await response.json();
    return data; // { valid: true/false, message: "...", expiresAt: "..." }
  } catch (err) {
    return {
      valid: false,
      message: 'Nao foi possivel conectar ao servidor de licenciamento. Verifique sua internet.'
    };
  }
}

// -----------------------------------------------------------------------
// 4. Exemplo de uso completo: pede a key ao usuario e libera/bloqueia acesso
// -----------------------------------------------------------------------
async function verificarAcessoDoApp() {
  const CACHED_KEY_STORAGE = 'app_license_key';

  // Se ja existe uma key salva localmente, tenta revalidar automaticamente
  let key = localStorage.getItem(CACHED_KEY_STORAGE);

  if (!key) {
    key = window.prompt('Digite sua Key de licenca (ex: KEY-XXXX-XXXX-XXXX-XXXX):');
    if (!key) {
      mostrarErroDeAcesso('Nenhuma Key informada.');
      return;
    }
  }

  const result = await activateLicenseKey(key.trim().toUpperCase());

  if (result.valid) {
    localStorage.setItem(CACHED_KEY_STORAGE, key.trim().toUpperCase());
    liberarAcessoAoApp(result.expiresAt);
  } else {
    // Mensagens possiveis: "Key invalida.", "Esta Key foi revogada.",
    // "Esta Key esta expirada.", "Esta Key ja esta vinculada a outro dispositivo."
    localStorage.removeItem(CACHED_KEY_STORAGE);
    mostrarErroDeAcesso(result.message);
  }
}

function liberarAcessoAoApp(expiresAt) {
  console.log('Acesso liberado!', expiresAt ? `Expira em: ${expiresAt}` : 'Licenca permanente.');
  // Aqui voce chama a funcao que realmente inicia/desbloqueia seu aplicativo.
}

function mostrarErroDeAcesso(message) {
  console.error('Acesso negado:', message);
  // Aqui voce mostra a mensagem de erro na UI do seu app e bloqueia o uso.
}

// Exemplo de chamada no boot do app:
// verificarAcessoDoApp();

module.exports = { activateLicenseKey, getOrCreateDeviceId };
