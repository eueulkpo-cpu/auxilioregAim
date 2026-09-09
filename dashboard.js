// public/js/dashboard.js
// Toda a comunicacao usa o cookie de sessao httpOnly (credentials: 'same-origin',
// padrao do fetch para mesma origem). Nenhum segredo fica neste arquivo.

const els = {
  countLivre: document.getElementById('countLivre'),
  countAtivada: document.getElementById('countAtivada'),
  countExpirada: document.getElementById('countExpirada'),
  countRevogada: document.getElementById('countRevogada'),
  planSelect: document.getElementById('planSelect'),
  quantityInput: document.getElementById('quantityInput'),
  generateBtn: document.getElementById('generateBtn'),
  generateMsg: document.getElementById('generateMsg'),
  searchInput: document.getElementById('searchInput'),
  statusFilter: document.getElementById('statusFilter'),
  refreshBtn: document.getElementById('refreshBtn'),
  tableBody: document.getElementById('keysTableBody'),
  emptyMsg: document.getElementById('emptyMsg'),
  logoutBtn: document.getElementById('logoutBtn')
};

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR');
}

function statusLabel(status) {
  const map = { livre: 'Livre', ativada: 'Ativada', expirada: 'Expirada', revogada: 'Revogada' };
  return map[status] || status;
}

async function loadKeys() {
  const search = els.searchInput.value.trim();
  const status = els.statusFilter.value;

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (status) params.set('status', status);

  const res = await fetch(`/api/admin/keys?${params.toString()}`, {
    credentials: 'same-origin'
  });

  if (res.status === 401) {
    window.location.href = '/admin/login';
    return;
  }

  const data = await res.json();
  renderCounts(data.counts);
  renderTable(data.keys);
}

function renderCounts(counts) {
  els.countLivre.textContent = counts.livre || 0;
  els.countAtivada.textContent = counts.ativada || 0;
  els.countExpirada.textContent = counts.expirada || 0;
  els.countRevogada.textContent = counts.revogada || 0;
}

function renderTable(keys) {
  els.tableBody.innerHTML = '';

  if (!keys || keys.length === 0) {
    els.emptyMsg.hidden = false;
    return;
  }
  els.emptyMsg.hidden = true;

  keys.forEach((k) => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td class="key-cell">${escapeHtml(k.key)}</td>
      <td><span class="badge badge-${k.status}">${statusLabel(k.status)}</span></td>
      <td>${escapeHtml(k.duration_label)}</td>
      <td>${formatDate(k.created_at)}</td>
      <td>${formatDate(k.activated_at)}</td>
      <td>${k.expires_at ? formatDate(k.expires_at) : (k.status === 'ativada' || k.status === 'expirada' ? 'Nunca' : '-')}</td>
      <td>${k.device_id ? escapeHtml(k.device_id) : '-'}</td>
      <td class="actions-cell"></td>
    `;

    const actionsCell = tr.querySelector('.actions-cell');

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn-secondary btn-small';
    copyBtn.textContent = 'Copiar';
    copyBtn.addEventListener('click', () => copyKey(k.key));
    actionsCell.appendChild(copyBtn);

    if (k.status !== 'revogada') {
      const revokeBtn = document.createElement('button');
      revokeBtn.className = 'btn btn-danger btn-small';
      revokeBtn.textContent = 'Revogar';
      revokeBtn.addEventListener('click', () => revokeKey(k.key));
      actionsCell.appendChild(revokeBtn);
    }

    els.tableBody.appendChild(tr);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

async function copyKey(key) {
  try {
    await navigator.clipboard.writeText(key);
  } catch (e) {
    // Fallback simples caso a Clipboard API esteja bloqueada
    const textarea = document.createElement('textarea');
    textarea.value = key;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

async function revokeKey(key) {
  if (!confirm(`Revogar a key ${key}? Esta acao nao pode ser desfeita.`)) return;

  const res = await fetch(`/api/admin/keys/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    credentials: 'same-origin'
  });

  if (res.status === 401) {
    window.location.href = '/admin/login';
    return;
  }

  const data = await res.json();
  if (!res.ok) {
    alert(data.error || 'Erro ao revogar a Key.');
    return;
  }
  loadKeys();
}

async function generateKey() {
  const plan = els.planSelect.value;
  const quantity = parseInt(els.quantityInput.value, 10) || 1;

  els.generateBtn.disabled = true;
  els.generateBtn.textContent = 'Gerando...';
  els.generateMsg.hidden = true;

  try {
    const res = await fetch('/api/admin/keys', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, quantity })
    });

    if (res.status === 401) {
      window.location.href = '/admin/login';
      return;
    }

    const data = await res.json();

    if (!res.ok) {
      els.generateMsg.textContent = data.error || 'Erro ao gerar Key.';
      els.generateMsg.hidden = false;
      return;
    }

    els.generateMsg.textContent = `${data.created} Key(s) gerada(s) com sucesso.`;
    els.generateMsg.hidden = false;
    loadKeys();
  } finally {
    els.generateBtn.disabled = false;
    els.generateBtn.textContent = 'Gerar Key';
  }
}

async function logout() {
  await fetch('/admin/logout', { method: 'POST', credentials: 'same-origin' });
  window.location.href = '/admin/login';
}

// ------------------------------------------------------------------
// Eventos
// ------------------------------------------------------------------
els.generateBtn.addEventListener('click', generateKey);
els.refreshBtn.addEventListener('click', loadKeys);
els.logoutBtn.addEventListener('click', logout);

let searchDebounce;
els.searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(loadKeys, 300);
});
els.statusFilter.addEventListener('change', loadKeys);

// Carga inicial + atualizacao automatica a cada 30s (para refletir expiracoes)
loadKeys();
setInterval(loadKeys, 30000);
