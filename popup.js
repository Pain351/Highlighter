const list = document.getElementById('list');
const searchInput = document.getElementById('searchInput');
const countBadge = document.getElementById('countBadge');
const clearAllBtn = document.getElementById('clearAllBtn');
const exportBtn = document.getElementById('exportBtn');
const toast = document.getElementById('toast');

let allHighlights = [];

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function getFaviconUrl(url) {
  try {
    const origin = new URL(url).origin;
    return `${origin}/favicon.ico`;
  } catch {
    return '';
  }
}

function highlight(text, query) {
  if (!query) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(`(${escapedQuery})`, 'gi'), '<mark>$1</mark>');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderList(highlights, query = '') {
  countBadge.textContent = allHighlights.length;

  if (highlights.length === 0) {
    list.innerHTML = `
      <div class="empty">
        <div class="empty-icon">✏️</div>
        <div class="empty-title">${query ? 'No results found' : 'No highlights yet'}</div>
        <div class="empty-sub">${query ? 'Try a different search term.' : 'Select any text on a page,\nright-click and choose Save Highlight.'}</div>
      </div>`;
    return;
  }

  list.innerHTML = highlights.map(h => `
    <div class="card" data-id="${h.id}">
      <div class="card-text">${highlight(h.text, query)}</div>
      <div class="card-meta">
        <div class="card-source">
          <img class="favicon" src="${getFaviconUrl(h.url)}" onerror="this.style.display='none'" />
          <a class="source-link" href="${escapeHtml(h.url)}" target="_blank" title="${escapeHtml(h.title || h.url)}">${getDomain(h.url)}</a>
        </div>
        <div class="card-right">
          <span class="timestamp">${formatTime(h.timestamp)}</span>
          <button class="delete-btn" data-id="${h.id}" title="Delete">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  // delete buttons
  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      allHighlights = allHighlights.filter(h => h.id !== id);
      chrome.storage.local.set({ highlights: allHighlights }, () => {
        const query = searchInput.value.trim().toLowerCase();
        const filtered = query ? allHighlights.filter(h => h.text.toLowerCase().includes(query)) : allHighlights;
        renderList(filtered, query);
        showToast('Deleted');
      });
    });
  });
}

function loadHighlights() {
  chrome.storage.local.get({ highlights: [] }, (data) => {
    allHighlights = data.highlights;
    renderList(allHighlights);
  });
}

searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = query
    ? allHighlights.filter(h =>
        h.text.toLowerCase().includes(query) ||
        (h.title && h.title.toLowerCase().includes(query)) ||
        getDomain(h.url).toLowerCase().includes(query)
      )
    : allHighlights;
  renderList(filtered, query);
});

clearAllBtn.addEventListener('click', () => {
  if (allHighlights.length === 0) return;
  if (confirm('Clear all highlights?')) {
    allHighlights = [];
    chrome.storage.local.set({ highlights: [] }, () => {
      renderList([]);
      showToast('Cleared all');
    });
  }
});

exportBtn.addEventListener('click', () => {
  if (allHighlights.length === 0) {
    showToast('Nothing to export');
    return;
  }

  const md = allHighlights.map(h => {
    const date = new Date(h.timestamp).toLocaleString();
    return `> ${h.text}\n\n**Source:** [${h.title || getDomain(h.url)}](${h.url})\n**Saved:** ${date}\n\n---`;
  }).join('\n\n');

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `highlights-${new Date().toISOString().slice(0,10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exported!');
});

loadHighlights();
