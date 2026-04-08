// Legit CPP logic ported to JS - activates when Legit toggle is on

let legitActive = false;

function toggleLegit(active) {
  legitActive = active;
  console.log('Legit ' + (active ? 'ativado' : 'desativado'));
}

function calcularY(deltaY, sensi) {
  if (!legitActive) return deltaY;

  let dy = (deltaY * (sensi / 200.0));

  // Zona de sucção
  if (dy > 14.0 && dy < 19.0) {
    dy = 14.0 + ((dy - 14.0) * 0.3);
  }

  // Travar rígida
  if (dy > 19.0) {
    dy = 19.0;
  }

  return dy;
}

// Demo function
function testarCalculo() {
  const deltaY = parseFloat(document.getElementById('deltaY').value || 0);
  const sensi = parseFloat(document.getElementById('sensi').value || 100);
  const original = deltaY;
  const processado = calcularY(deltaY, sensi);
  document.getElementById('resultado').innerHTML = `Original: ${original.toFixed(2)} -> Processado: ${processado.toFixed(2)} (Legit ${legitActive ? 'ON' : 'OFF'})`;
}
