// Anti-Shake JS - Estabiliza a mira removendo tremedeira (smoothing via EMA low-pass filter)
// Similar structure to Legit.js - ativa quando AntiShake toggle estiver on

let antiShakeActive = false;
let smoothedX = 0;
let smoothedY = 0;
let alpha = 0.8; // Smoothing factor (0.7-0.95): higher = more smoothing

function toggleAntiShake(active) {
  antiShakeActive = active;
  if (!active) {
    smoothedX = 0;
    smoothedY = 0;
  }
  console.log('AntiShake ' + (active ? 'ativado' : 'desativado'));
}

function estabilizarMira(deltaX, deltaY, intensity = 80) {
  if (!antiShakeActive) return { x: deltaX, y: deltaY };

  // Intensity 0-100 -> alpha 0.5-0.95
  alpha = 0.5 + (intensity / 100) * 0.45;

  // EMA low-pass filter para remover high-frequency shake/tremedeira
  smoothedX = alpha * deltaX + (1 - alpha) * smoothedX;
  smoothedY = alpha * deltaY + (1 - alpha) * smoothedY;

  return { x: smoothedX, y: smoothedY };
}

// Demo function - igual ao Legit.js
function testarEstabilizacao() {
  const deltaX = parseFloat(document.getElementById('deltaX')?.value || Math.random() * 10 - 5);
  const deltaY = parseFloat(document.getElementById('deltaY')?.value || Math.random() * 10 - 5);
  const intensity = parseFloat(document.getElementById('intensity')?.value || 80);
  const original = `X:${deltaX.toFixed(2)} Y:${deltaY.toFixed(2)}`;
  const estabilizado = estabilizarMira(deltaX, deltaY, intensity);
  const result = `X:${estabilizado.x.toFixed(2)} Y:${estabilizado.y.toFixed(2)} (AntiShake ${antiShakeActive ? 'ON alpha=' + alpha.toFixed(2) : 'OFF'})`;
  document.getElementById('resultado')?.innerHTML = `${original} -> ${result}`;
  console.log(result);
}

