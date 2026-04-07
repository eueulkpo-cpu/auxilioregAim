// Estruturas (objetos)
const inimigo = {
  head: { x: 48, y: 20, w: 8, h: 8 },
  body: { x: 40, y: 30, w: 20, h: 30 }
};

// Verifica colisão
function dentro(x, y, h) {
  return (
    x >= h.x &&
    x <= h.x + h.w &&
    y >= h.y &&
    y <= h.y + h.h
  );
}

// Prioridade: cabeça primeiro
function detectarHit(tiroX, tiroY, player) {
  if (dentro(tiroX, tiroY, player.head)) {
    return "HEADSHOT 🔥";
  }
  if (dentro(tiroX, tiroY, player.body)) {
    return "BODY 😐";
  }
  return "MISS ❌";
}

// Simulando entrada (igual cin)
let tiroX = Number(prompt("Digite X do tiro:"));
let tiroY = Number(prompt("Digite Y do tiro:"));

// Resultado
alert(detectarHit(tiroX, tiroY, inimigo));