// public/js/login.js
// Apenas envia usuario/senha para o servidor via fetch. Nenhum segredo
// (senha real, hash, ou API secret) fica embutido neste arquivo.

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorMsg = document.getElementById('errorMsg');
  const btn = document.getElementById('loginBtn');

  errorMsg.hidden = true;
  btn.disabled = true;
  btn.textContent = 'Entrando...';

  try {
    const res = await fetch('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      window.location.href = data.redirectTo || '/admin';
    } else {
      errorMsg.textContent = data.error || 'Falha no login.';
      errorMsg.hidden = false;
    }
  } catch (err) {
    errorMsg.textContent = 'Erro de conexao com o servidor.';
    errorMsg.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});
