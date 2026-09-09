// utils/keyGenerator.js
// Geracao de Keys aleatorias no formato KEY-XXXX-XXXX-XXXX-XXXX
// e calculo de datas de expiracao a partir de um "plano" de duracao.

const crypto = require('crypto');

// Alfabeto sem caracteres ambiguos (sem 0/O, 1/I/L, etc.)
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomBlock(length) {
  let block = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    block += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return block;
}

/**
 * Gera uma Key no formato KEY-XXXX-XXXX-XXXX-XXXX (128 bits de entropia aprox.)
 */
function generateKey() {
  const blocks = [randomBlock(4), randomBlock(4), randomBlock(4), randomBlock(4)];
  return `KEY-${blocks.join('-')}`;
}

// Planos de validade suportados
const DURATION_PLANS = {
  '1d': { label: '1 dia', ms: 1 * 24 * 60 * 60 * 1000 },
  '7d': { label: '7 dias', ms: 7 * 24 * 60 * 60 * 1000 },
  '30d': { label: '30 dias', ms: 30 * 24 * 60 * 60 * 1000 },
  '90d': { label: '90 dias', ms: 90 * 24 * 60 * 60 * 1000 },
  'permanent': { label: 'Permanente', ms: null }
};

/**
 * Calcula a data de expiracao (ISO 8601) a partir do momento em que a Key
 * e ATIVADA (primeiro uso), nao da criacao. Retorna null para Keys permanentes.
 */
function calculateExpiresAt(planCode, fromDate = new Date()) {
  const plan = DURATION_PLANS[planCode];
  if (!plan) return null;
  if (plan.ms === null) return null; // permanente = nunca expira
  return new Date(fromDate.getTime() + plan.ms).toISOString();
}

function isValidPlan(planCode) {
  return Object.prototype.hasOwnProperty.call(DURATION_PLANS, planCode);
}

function getPlanLabel(planCode) {
  return DURATION_PLANS[planCode] ? DURATION_PLANS[planCode].label : 'Desconhecido';
}

module.exports = {
  generateKey,
  DURATION_PLANS,
  calculateExpiresAt,
  isValidPlan,
  getPlanLabel
};
