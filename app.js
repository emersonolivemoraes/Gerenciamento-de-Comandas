// Estado da Aplicação
let state = {
  tables: [],
  menu: [],
  users: [],
  revenueToday: 0.00,
  selectedTableId: null,
  paymentMethod: null,
  filterStatus: 'all',
  menuSearchQuery: '',
  menuFilterCategory: 'all',
  editingMenuItemId: null,
  editingUserId: null,
  cart: [],         // Cesta de produtos pendentes
  cartOpen: true,   // Controle de exibição da cesta
  confirmedOrdersOpen: true, // Controle de exibição dos pedidos confirmados
  clients: [],      // Clientes cadastrados
  fiados: [],       // Dívidas pendentes (Fiados)
  orders: [],       // Pedidos em produção (Cozinha & Balcão)
  ordersFilterStatus: 'all', // 'all' | 'preparing' | 'ready' | 'delivered'
  balcao: {
    id: 'balcao',
    status: 'occupied',
    clientName: 'Balcão / Viagem',
    guests: 1,
    openedAt: null,
    items: [],
    discount: 0,
    serviceFee: false
  }
};

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  
  // Atualiza os cronômetros das mesas a cada 1 minuto
  setInterval(updateTableTimes, 60000);

  // Sincronização em tempo real de pedidos feitos no autoatendimento
  window.addEventListener('storage', () => {
    loadOrdersFromStorage();
    updatePendingOrdersBadge();
    const ordersPanel = document.getElementById('view-orders-panel');
    if (ordersPanel && ordersPanel.classList.contains('active')) {
      renderOrdersManagement();
    }
  });

  // Atualização periódica dos tempos dos pedidos a cada 15 segundos
  setInterval(() => {
    const ordersPanel = document.getElementById('view-orders-panel');
    if (ordersPanel && ordersPanel.classList.contains('active')) {
      renderOrdersManagement();
    }
    updatePendingOrdersBadge();
  }, 15000);
});

function initApp() {
  // 1. Carregar Cardápio com sincronização de imagens
  const savedMenu = localStorage.getItem('bistro_menu');
  if (savedMenu) {
    try {
      state.menu = JSON.parse(savedMenu);
    } catch (e) {
      state.menu = [...DEFAULT_MENU];
    }
    let menuUpdated = false;
    state.menu.forEach(item => {
      if (!item.image) {
        const def = (typeof DEFAULT_MENU !== 'undefined' ? DEFAULT_MENU : []).find(d => d.id === item.id || (d.name && d.name.toLowerCase() === item.name.toLowerCase()));
        if (def && def.image) {
          item.image = def.image;
          menuUpdated = true;
        } else if (typeof CATEGORY_DEFAULT_IMAGES !== 'undefined' && CATEGORY_DEFAULT_IMAGES[item.category]) {
          item.image = CATEGORY_DEFAULT_IMAGES[item.category];
          menuUpdated = true;
        }
      }
    });
    if (menuUpdated) {
      localStorage.setItem('bistro_menu', JSON.stringify(state.menu));
    }
  } else {
    state.menu = [...DEFAULT_MENU];
    localStorage.setItem('bistro_menu', JSON.stringify(state.menu));
  }

  // 2. Carregar Mesas (Default 12 mesas se não existirem no localStorage)
  const savedTables = localStorage.getItem('bistro_tables');
  if (savedTables) {
    state.tables = JSON.parse(savedTables);
  } else {
    for (let i = 1; i <= 12; i++) {
      state.tables.push({
        id: i,
        status: 'free',
        clientName: '',
        guests: 2,
        openedAt: null,
        items: [],
        discount: 0,
        serviceFee: true
      });
    }
    saveTablesToStorage();
  }

  // 3. Carregar Faturamento
  const savedRevenue = localStorage.getItem('bistro_revenue');
  if (savedRevenue) {
    state.revenueToday = parseFloat(savedRevenue);
  }

  // 4. Carregar Tema
  const savedTheme = localStorage.getItem('bistro_theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    updateThemeUI(true);
  } else {
    document.body.classList.remove('dark');
    updateThemeUI(false);
  }

  // 5. Exibir Data Atual
  displayCurrentDate();

  // 6. Carregar Usuários
  const savedUsers = localStorage.getItem('bistro_users');
  if (savedUsers) {
    state.users = JSON.parse(savedUsers);
  }

  // 7. Carregar Clientes e Fiados
  const savedClients = localStorage.getItem('bistro_clients');
  if (savedClients) {
    state.clients = JSON.parse(savedClients);
  }

  const savedFiados = localStorage.getItem('bistro_fiados');
  if (savedFiados) {
    try {
      state.fiados = JSON.parse(savedFiados);
    } catch (e) {
      state.fiados = [];
    }
    let needsSave = false;
    state.fiados.forEach((f, idx) => {
      if (!f.id) {
        f.id = `fiado-${Date.now()}-${idx}`;
        needsSave = true;
      }
    });
    if (needsSave) saveFiadosToStorage();
  }

  const savedBalcao = localStorage.getItem('bistro_balcao');
  if (savedBalcao) {
    state.balcao = JSON.parse(savedBalcao);
  }

  // 8. Carregar Pedidos
  loadOrdersFromStorage();
  updatePendingOrdersBadge();

  updateStats();
  renderTables();
  renderMenuEditor();
  renderUsersTable();
}

function displayCurrentDate() {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const today = new Date();
  document.getElementById('current-date').textContent = today.toLocaleDateString('pt-BR', options);
}

function loadOrdersFromStorage() {
  const savedOrders = localStorage.getItem('bistro_orders');
  if (savedOrders) {
    try {
      state.orders = JSON.parse(savedOrders);
    } catch (e) {
      state.orders = [];
    }
  }
}

function saveOrdersToStorage() {
  localStorage.setItem('bistro_orders', JSON.stringify(state.orders));
}

function saveTablesToStorage() {
  localStorage.setItem('bistro_tables', JSON.stringify(state.tables));
}

function saveMenuToStorage() {
  localStorage.setItem('bistro_menu', JSON.stringify(state.menu));
}

function saveRevenueToStorage() {
  localStorage.setItem('bistro_revenue', state.revenueToday.toString());
}

function saveClientsToStorage() {
  localStorage.setItem('bistro_clients', JSON.stringify(state.clients));
}

function saveFiadosToStorage() {
  localStorage.setItem('bistro_fiados', JSON.stringify(state.fiados));
}

function saveBalcaoToStorage() {
  localStorage.setItem('bistro_balcao', JSON.stringify(state.balcao));
}

// --- UTILITÁRIOS ---
function formatCurrency(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

function getMenuItemById(id) {
  return state.menu.find(item => item.id === id);
}

function getTableById(id) {
  if (id === 'balcao') return state.balcao;
  return state.tables.find(t => t.id === id);
}

function getTimeDifference(dateStr) {
  if (!dateStr) return '';
  const diffMs = new Date() - new Date(dateStr);
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 60) {
    return `${diffMins} min`;
  } else {
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins.toString().padStart(2, '0')}m`;
  }
}

// --- GERENCIAMENTO DE INTERFACE (SPA) ---
function switchView(viewName) {
  // Desativa links
  document.getElementById('nav-tables').classList.remove('active');
  document.getElementById('nav-orders').classList.remove('active');
  document.getElementById('nav-menu-editor').classList.remove('active');
  document.getElementById('nav-clients').classList.remove('active');
  document.getElementById('nav-settings').classList.remove('active');
  
  // Oculta painéis
  document.getElementById('view-tables-panel').classList.remove('active');
  document.getElementById('view-orders-panel').classList.remove('active');
  document.getElementById('view-menu-editor-panel').classList.remove('active');
  document.getElementById('view-clients-panel').classList.remove('active');
  document.getElementById('view-settings-panel').classList.remove('active');

  if (viewName === 'tables') {
    document.getElementById('nav-tables').classList.add('active');
    document.getElementById('view-tables-panel').classList.add('active');
    document.getElementById('view-title').textContent = "Gerenciamento de Mesas";
    document.getElementById('dashboard-stats').style.display = 'grid';
  } else if (viewName === 'orders') {
    document.getElementById('nav-orders').classList.add('active');
    document.getElementById('view-orders-panel').classList.add('active');
    document.getElementById('view-title').textContent = "Gestão de Pedidos (Cozinha & Balcão)";
    document.getElementById('dashboard-stats').style.display = 'none';
    renderOrdersManagement();
  } else if (viewName === 'menu-editor') {
    document.getElementById('nav-menu-editor').classList.add('active');
    document.getElementById('view-menu-editor-panel').classList.add('active');
    document.getElementById('view-title').textContent = "Configurações do Cardápio";
    document.getElementById('dashboard-stats').style.display = 'none';
    renderMenuEditor();
  } else if (viewName === 'clients') {
    document.getElementById('nav-clients').classList.add('active');
    document.getElementById('view-clients-panel').classList.add('active');
    document.getElementById('view-title').textContent = "Clientes & Fiados";
    document.getElementById('dashboard-stats').style.display = 'none';
    renderClientsList();
    renderFiadosList();
  } else if (viewName === 'settings') {
    document.getElementById('nav-settings').classList.add('active');
    document.getElementById('view-settings-panel').classList.add('active');
    document.getElementById('view-title').textContent = "Configurações";
    document.getElementById('dashboard-stats').style.display = 'none';
    renderUsersTable();
  }
}

// --- TEMA (DARK MODE) ---
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('bistro_theme', isDark ? 'dark' : 'light');
  updateThemeUI(isDark);
}

function updateThemeUI(isDark) {
  const themeText = document.getElementById('theme-text');
  const themeIcon = document.getElementById('theme-icon');
  
  if (isDark) {
    themeText.textContent = "Modo Claro";
    themeIcon.innerHTML = `<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>`;
  } else {
    themeText.textContent = "Modo Escuro";
    themeIcon.innerHTML = `<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>`;
  }
}

// --- METRICAS / STATS ---
function updateStats() {
  document.getElementById('stat-revenue').textContent = formatCurrency(state.revenueToday);
  
  const occupiedCount = state.tables.filter(t => t.status !== 'free').length;
  document.getElementById('stat-occupied').textContent = `${occupiedCount} / ${state.tables.length}`;
}

// --- VISÃO DAS MESAS ---
function renderTables() {
  const container = document.getElementById('tables-container');
  container.innerHTML = '';

  const filtered = state.tables.filter(t => {
    if (state.filterStatus === 'all') return true;
    return t.status === state.filterStatus;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/></svg>
        <p>Nenhuma mesa encontrada para este filtro.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(table => {
    const card = document.createElement('div');
    card.className = `table-card ${table.status}`;
    card.onclick = () => openComandaDrawer(table.id);

    // Totais e Status
    let totals = { total: 0 };
    if (table.status !== 'free') {
      totals = calculateTableTotals(table);
    }

    let badgeText = 'Livre';
    if (table.status === 'occupied') badgeText = 'Ocupada';
    if (table.status === 'paying') badgeText = 'Fechando';

    const clientHtml = table.status !== 'free'
      ? `<div class="table-client">${table.clientName || 'Cliente sem nome'}</div>
         <div class="table-time">Ativa há: ${getTimeDifference(table.openedAt)}</div>`
      : `<div class="table-client" style="color: var(--text-tertiary); font-weight: normal;">Mesa disponível</div>`;

    const footerHtml = table.status !== 'free'
      ? `<div class="table-price-label">Consumo</div>
         <div class="table-price">${formatCurrency(totals.total)}</div>`
      : `<div class="table-price-label">Pessoas</div>
         <div class="table-price">${table.guests}</div>`;

    card.innerHTML = `
      <div class="table-header">
        <span class="table-number">Mesa ${String(table.id).padStart(2, '0')}</span>
        <span class="table-badge ${table.status}">${badgeText}</span>
      </div>
      <div class="table-details">
        ${clientHtml}
      </div>
      <div class="table-footer">
        ${footerHtml}
      </div>
    `;
    container.appendChild(card);
  });
}

function updateTableTimes() {
  if (state.filterStatus === 'all' || state.filterStatus === 'occupied' || state.filterStatus === 'paying') {
    renderTables();
  }
}

function filterTables(status) {
  state.filterStatus = status;
  
  // Atualiza botões
  document.getElementById('filter-all').classList.remove('active');
  document.getElementById('filter-free').classList.remove('active');
  document.getElementById('filter-occupied').classList.remove('active');
  document.getElementById('filter-paying').classList.remove('active');
  
  document.getElementById(`filter-${status === 'all' ? 'all' : status}`).classList.add('active');
  renderTables();
}

function addNewTable() {
  const nextId = state.tables.reduce((max, t) => t.id > max ? t.id : max, 0) + 1;
  state.tables.push({
    id: nextId,
    status: 'free',
    clientName: '',
    guests: 2,
    openedAt: null,
    items: [],
    discount: 0,
    serviceFee: true
  });
  saveTablesToStorage();
  updateStats();
  renderTables();
}

// --- DRAWER GERENCIADOR DE COMANDAS ---
function openComandaDrawer(tableId) {
  state.selectedTableId = tableId;
  state.cart = [];
  state.cartOpen = true;
  state.confirmedOrdersOpen = true;
  const table = getTableById(tableId);
  
  // Configurar título do Drawer
  if (table.id === 'balcao') {
    document.getElementById('drawer-title').textContent = `Venda Rápida (Balcão)`;
  } else {
    document.getElementById('drawer-title').textContent = `Mesa ${String(table.id).padStart(2, '0')}`;
  }
  
  const subtitle = document.getElementById('drawer-subtitle');
  subtitle.textContent = table.status === 'free' ? 'Livre' : (table.status === 'occupied' ? 'Em consumo' : 'Aguardando Pagamento');
  subtitle.className = `drawer-subtitle ${table.status}`;

  // Renderizar o conteúdo
  renderComandaDrawerContent();

  // Abrir Drawer
  document.getElementById('overlay').classList.add('active');
  document.getElementById('comanda-drawer').classList.add('active');
}

function openBalcaoDrawer() {
  openComandaDrawer('balcao');
}

function closeDrawerAndModal() {
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.classList.remove('active');
  const drawer = document.getElementById('comanda-drawer');
  if (drawer) drawer.classList.remove('active');
  const checkoutModal = document.getElementById('checkout-modal');
  if (checkoutModal) checkoutModal.classList.remove('active');
  const payFiadoModal = document.getElementById('pay-fiado-modal');
  if (payFiadoModal) payFiadoModal.classList.remove('active');
  const userModal = document.getElementById('user-modal');
  if (userModal) userModal.classList.remove('active');
  state.selectedTableId = null;
}

function toggleConfirmedOrders() {
  state.confirmedOrdersOpen = !state.confirmedOrdersOpen;
  renderComandaDrawerContent();
}

function renderComandaDrawerContent() {
  const table = getTableById(state.selectedTableId);
  const body = document.getElementById('drawer-body');
  const footer = document.getElementById('drawer-footer');

  if (table.status === 'free') {
    // FORMULÁRIO DE ABERTURA
    body.innerHTML = `
      <div class="form-group">
        <label class="form-label" for="new-client-name">Nome do Cliente / Identificador</label>
        <input class="form-input" type="text" id="new-client-name" placeholder="Ex: João Silva ou Avulso">
      </div>
      <div class="form-group">
        <label class="form-label" for="new-guests">Quantidade de Pessoas</label>
        <input class="form-input" type="number" id="new-guests" min="1" max="20" value="${table.guests}">
      </div>
    `;
    
    footer.innerHTML = `
      <button class="action-btn" onclick="handleOpenComanda()" style="width: 100%;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        Abrir Comanda
      </button>
    `;
  } else {
    // COMANDA ATIVA
    const totals = calculateTableTotals(table);

    // ========= SEÇÃO 1: CESTA DE PEDIDOS PENDENTES (CARRINHO) =========
    const cartSectionHtml = renderCartSection();

    // ========= SEÇÃO 2: ITENS JÁ CONFIRMADOS NA COMANDA =========
    let confirmedItemsHtml = '';
    if (table.items.length > 0) {
      const confirmedItemsList = table.items.map(item => {
        const menuItem = getMenuItemById(item.menuItemId);
        if (!menuItem) return '';
        const itemTotal = menuItem.price * item.quantity;
        return `
          <div class="order-item-row">
            <div class="item-info">
              <span class="item-name">${menuItem.name}</span>
              <span class="item-price-unit">${formatCurrency(menuItem.price)}</span>
            </div>
            <div class="item-qty-controls">
              <button class="qty-btn" onclick="updateItemQty('${menuItem.id}', -1)">-</button>
              <span class="qty-value">${item.quantity}</span>
              <button class="qty-btn" onclick="updateItemQty('${menuItem.id}', 1)">+</button>
            </div>
            <div class="item-total-price">
              ${formatCurrency(itemTotal)}
            </div>
          </div>
        `;
      }).join('');

      confirmedItemsHtml = `
        <div class="confirmed-orders-section">
          <div class="confirmed-orders-header" onclick="toggleConfirmedOrders()">
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-free)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span class="confirmed-orders-title">Pedidos Confirmados (${table.items.reduce((s, i) => s + i.quantity, 0)} itens)</span>
            </div>
            <svg class="confirmed-chevron ${state.confirmedOrdersOpen ? '' : 'collapsed'}" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="confirmed-orders-body ${state.confirmedOrdersOpen ? '' : 'collapsed'}">
            <div class="order-items-container" style="overflow-y: visible;">
              ${confirmedItemsList}
            </div>
            <div class="bill-summary">
              <div class="summary-row">
                <span>Subtotal</span>
                <span>${formatCurrency(totals.subtotal)}</span>
              </div>
              <div class="summary-row" style="align-items: center;">
                <span style="display: flex; align-items: center; gap: 6px;">
                  <input type="checkbox" id="chk-service-fee" ${table.serviceFee ? 'checked' : ''} onchange="toggleServiceFee()">
                  Taxa de Serviço (10%)
                </span>
                <span>${formatCurrency(totals.serviceFeeAmount)}</span>
              </div>
              <div class="summary-row" style="align-items: center; margin-top: 4px;">
                <span>Desconto (R$)</span>
                <input class="form-input" type="number" id="input-discount" value="${table.discount || ''}" oninput="updateDiscount(this.value)" placeholder="0.00" style="width: 80px; padding: 4px 8px; font-size: 0.85rem; text-align: right;">
              </div>
              <div class="summary-row total">
                <span>Total Geral</span>
                <span style="color: var(--accent);">${formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // ========= SEÇÃO 3: CARDÁPIO PARA SELEÇÃO =========
    const menuSectionHtml = `
      <div class="menu-add-section" style="border-top: none; padding-top: 0;">
        <h4 style="font-size: 0.95rem; font-weight: 700; display: flex; align-items: center; gap: 8px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
          Cardápio
        </h4>
        
        <div class="menu-search-wrapper">
          <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input class="form-input search-input" type="text" id="menu-search" value="${state.menuSearchQuery}" oninput="handleMenuSearch(this.value)" placeholder="Buscar no cardápio...">
        </div>

        <div class="menu-cats-tabs">
          <button class="menu-cat-tab ${state.menuFilterCategory === 'all' ? 'active' : ''}" onclick="filterMenuCategory('all')">Todos</button>
          <button class="menu-cat-tab ${state.menuFilterCategory === 'entradas' ? 'active' : ''}" onclick="filterMenuCategory('entradas')">Entradas</button>
          <button class="menu-cat-tab ${state.menuFilterCategory === 'pratos' ? 'active' : ''}" onclick="filterMenuCategory('pratos')">Pratos</button>
          <button class="menu-cat-tab ${state.menuFilterCategory === 'porcoes' ? 'active' : ''}" onclick="filterMenuCategory('porcoes')">Porções</button>
          <button class="menu-cat-tab ${state.menuFilterCategory === 'bebidas' ? 'active' : ''}" onclick="filterMenuCategory('bebidas')">Bebidas</button>
          <button class="menu-cat-tab ${state.menuFilterCategory === 'sobremesas' ? 'active' : ''}" onclick="filterMenuCategory('sobremesas')">Doces</button>
        </div>

        <div class="menu-items-grid" id="menu-items-search-grid">
          ${renderMenuSearchGrid(table)}
        </div>
      </div>
    `;

    body.innerHTML = `
      ${cartSectionHtml}
      ${confirmedItemsHtml}
      ${menuSectionHtml}
    `;

    // Footer buttons
    const btnClosingText = table.status === 'paying' ? 'Voltar para Consumo' : 'Fechar Mesa (Aguardando Pago)';
    const btnClosingAction = table.status === 'paying' ? `changeTableStatus('occupied')` : `changeTableStatus('paying')`;
    
    footer.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr; gap: 8px;">
        <button class="action-btn" onclick="openCheckoutModal()" ${table.items.length === 0 ? 'disabled' : ''}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
          Ir para o Pagamento
        </button>
        <button class="action-btn secondary" onclick="${btnClosingAction}">
          ${btnClosingText}
        </button>
      </div>
    `;
  }
}

function renderMenuSearchGrid(table) {
  // Filtrar o cardápio
  let items = state.menu;

  if (state.menuFilterCategory !== 'all') {
    items = items.filter(item => item.category === state.menuFilterCategory);
  }

  if (state.menuSearchQuery.trim() !== '') {
    const q = state.menuSearchQuery.toLowerCase();
    items = items.filter(item => item.name.toLowerCase().includes(q) || (item.description && item.description.toLowerCase().includes(q)));
  }

  if (items.length === 0) {
    return `<div style="text-align: center; color: var(--text-tertiary); font-size: 0.85rem; padding: 12px 0;">Nenhum item correspondente.</div>`;
  }

  return items.map(item => {
    const cartItem = state.cart.find(c => c.menuItemId === item.id);
    const qty = cartItem ? cartItem.quantity : 0;
    const imageHtml = item.image ? `<img src="${item.image}" class="menu-item-card-image">` : '';
    return `
      <div class="menu-item-card ${qty > 0 ? 'in-cart' : ''}">
        ${imageHtml}
        <div class="menu-item-details">
          <span class="menu-item-name">${item.name}</span>
          <span class="menu-item-desc">${item.description || ''}</span>
          <span class="menu-item-price">${formatCurrency(item.price)}</span>
        </div>
        <div class="menu-item-cart-actions">
          ${qty > 0 ? `<button class="qty-btn cart-qty-btn" onclick="removeFromCart('${item.id}')">−</button><span class="cart-qty-badge">${qty}</span>` : ''}
          <button class="qty-btn cart-add-btn" onclick="addToCart('${item.id}')">+</button>
        </div>
      </div>
    `;
  }).join('');
}

// --- COMANDA LOGIC / HANDLERS ---
function handleOpenComanda() {
  const clientNameInput = document.getElementById('new-client-name');
  const guestsInput = document.getElementById('new-guests');
  
  const clientName = clientNameInput.value.trim() || `Mesa ${String(state.selectedTableId).padStart(2, '0')}`;
  const guests = parseInt(guestsInput.value) || 2;

  const table = getTableById(state.selectedTableId);
  table.status = 'occupied';
  table.clientName = clientName;
  table.guests = guests;
  table.openedAt = new Date().toISOString();
  table.items = [];
  table.discount = 0;
  table.serviceFee = true;

  saveTablesToStorage();
  updateStats();
  renderTables();
  
  // Re-renderizar drawer
  openComandaDrawer(state.selectedTableId);
}

function addItemToOrder(menuItemId) {
  const table = getTableById(state.selectedTableId);
  const existingItem = table.items.find(item => item.menuItemId === menuItemId);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    table.items.push({
      menuItemId: menuItemId,
      quantity: 1
    });
  }

  saveTablesToStorage();
  renderTables();
  renderComandaDrawerContent();
}

// --- CESTA DE PRODUTOS (CARRINHO) ---
function addToCart(menuItemId) {
  const existingItem = state.cart.find(item => item.menuItemId === menuItemId);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    state.cart.push({ menuItemId, quantity: 1 });
  }
  state.cartOpen = true;
  renderComandaDrawerContent();
}

function removeFromCart(menuItemId) {
  const idx = state.cart.findIndex(item => item.menuItemId === menuItemId);
  if (idx !== -1) {
    state.cart[idx].quantity -= 1;
    if (state.cart[idx].quantity <= 0) {
      state.cart.splice(idx, 1);
    }
  }
  renderComandaDrawerContent();
}

function clearCart() {
  state.cart = [];
  state.cartOpen = false;
  renderComandaDrawerContent();
}

function toggleCart() {
  state.cartOpen = !state.cartOpen;
  renderComandaDrawerContent();
}

function getCartTotal() {
  return state.cart.reduce((sum, item) => {
    const menuItem = getMenuItemById(item.menuItemId);
    return sum + (menuItem ? menuItem.price * item.quantity : 0);
  }, 0);
}

function getCartItemCount() {
  return state.cart.reduce((sum, item) => sum + item.quantity, 0);
}

function confirmCartAndSendToProduction() {
  if (state.cart.length === 0) return;

  const table = getTableById(state.selectedTableId);
  const isBalcao = table.id === 'balcao';

  // Registrar pedido na fila de Gestão de Pedidos (Cozinha & Balcão)
  const newOrder = {
    id: `order-${Date.now()}`,
    ticketNumber: isBalcao ? 'Balcão' : `Mesa ${String(table.id).padStart(2, '0')}`,
    customerName: table.clientName || (isBalcao ? 'Cliente Balcão' : `Mesa ${table.id}`),
    orderType: isBalcao ? 'balcao' : 'mesa',
    location: isBalcao ? 'Balcão de Venda' : `Mesa ${String(table.id).padStart(2, '0')}`,
    destination: isBalcao ? 'Retirar no Balcão' : `Entregar na Mesa ${String(table.id).padStart(2, '0')}`,
    items: JSON.parse(JSON.stringify(state.cart)),
    notes: '',
    total: getCartTotal(),
    createdAt: new Date().toISOString(),
    status: 'preparing' // 'preparing' | 'ready' | 'delivered'
  };

  state.orders.unshift(newOrder);
  saveOrdersToStorage();
  updatePendingOrdersBadge();

  // Transfere itens do carrinho para a comanda
  state.cart.forEach(cartItem => {
    const existingItem = table.items.find(i => i.menuItemId === cartItem.menuItemId);
    if (existingItem) {
      existingItem.quantity += cartItem.quantity;
    } else {
      table.items.push({
        menuItemId: cartItem.menuItemId,
        quantity: cartItem.quantity
      });
    }
  });

  // Limpa o carrinho
  state.cart = [];
  state.cartOpen = false;

  saveTablesToStorage();
  renderTables();
  renderComandaDrawerContent();

  // Feedback visual: notificação de sucesso
  showProductionNotification();
}

function showProductionNotification() {
  // Remove notificação anterior se existir
  const existing = document.getElementById('production-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'production-toast';
  toast.className = 'production-toast';
  toast.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    <span>Pedido enviado para a produção!</span>
  `;
  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Remove após 3 segundos
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

function renderCartSection() {
  const itemCount = getCartItemCount();
  const cartTotal = getCartTotal();

  if (itemCount === 0) {
    return ''; // Não mostra nada se o carrinho estiver vazio
  }

  // Header da cesta com toggle
  let cartHtml = `
    <div class="cart-section">
      <div class="cart-header" onclick="toggleCart()">
        <div class="cart-header-left">
          <div class="cart-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
            <span class="cart-count-badge">${itemCount}</span>
          </div>
          <span class="cart-title">Cesta de Pedidos</span>
        </div>
        <div class="cart-header-right">
          <span class="cart-total-preview">${formatCurrency(cartTotal)}</span>
          <svg class="cart-chevron ${state.cartOpen ? '' : 'collapsed'}" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
  `;

  // Corpo expandível
  cartHtml += `<div class="cart-body ${state.cartOpen ? '' : 'collapsed'}">`;

  state.cart.forEach(cartItem => {
    const menuItem = getMenuItemById(cartItem.menuItemId);
    if (!menuItem) return;
    const itemTotal = menuItem.price * cartItem.quantity;

    cartHtml += `
      <div class="cart-item-row">
        <div class="cart-item-info">
          <span class="cart-item-name">${menuItem.name}</span>
          <span class="cart-item-unit">${formatCurrency(menuItem.price)} un.</span>
        </div>
        <div class="cart-item-controls">
          <button class="qty-btn cart-qty-btn" onclick="removeFromCart('${menuItem.id}')">−</button>
          <span class="qty-value">${cartItem.quantity}</span>
          <button class="qty-btn cart-qty-btn" onclick="addToCart('${menuItem.id}')">+</button>
        </div>
        <span class="cart-item-total">${formatCurrency(itemTotal)}</span>
      </div>
    `;
  });

  cartHtml += `
      <div class="cart-summary">
        <div class="cart-summary-row">
          <span>Total da Cesta (${itemCount} ${itemCount === 1 ? 'item' : 'itens'})</span>
          <span class="cart-summary-total">${formatCurrency(cartTotal)}</span>
        </div>
      </div>
      <div class="cart-actions">
        <button class="action-btn cart-confirm-btn" onclick="confirmCartAndSendToProduction()">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Confirmar e Enviar para Produção
        </button>
        <button class="action-btn secondary cart-clear-btn" onclick="clearCart()">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          Limpar Cesta
        </button>
      </div>
    </div>
  </div>
  `;

  return cartHtml;
}

function updateItemQty(menuItemId, change) {
  const table = getTableById(state.selectedTableId);
  const itemIndex = table.items.findIndex(item => item.menuItemId === menuItemId);

  if (itemIndex !== -1) {
    table.items[itemIndex].quantity += change;
    
    if (table.items[itemIndex].quantity <= 0) {
      table.items.splice(itemIndex, 1);
    }
    
    saveTablesToStorage();
    renderTables();
    renderComandaDrawerContent();
  }
}

function toggleServiceFee() {
  const checkbox = document.getElementById('chk-service-fee');
  const table = getTableById(state.selectedTableId);
  table.serviceFee = checkbox.checked;
  
  saveTablesToStorage();
  renderTables();
  renderComandaDrawerContent();
}

function updateDiscount(value) {
  const table = getTableById(state.selectedTableId);
  table.discount = parseFloat(value) || 0;
  
  saveTablesToStorage();
  renderTables();
  
  // Evita re-render total do drawer para não perder foco no input
  // Apenas recalcula valores e atualiza texto do total
  const totals = calculateTableTotals(table);
  const totalLabel = document.querySelector('.summary-row.total span:last-child');
  const serviceLabel = document.querySelector('.summary-row:nth-child(2) span:last-child');
  
  if (totalLabel) totalLabel.textContent = formatCurrency(totals.total);
  if (serviceLabel) serviceLabel.textContent = formatCurrency(totals.serviceFeeAmount);
}

function handleMenuSearch(query) {
  state.menuSearchQuery = query;
  const table = getTableById(state.selectedTableId);
  document.getElementById('menu-items-search-grid').innerHTML = renderMenuSearchGrid(table);
}

function filterMenuCategory(category) {
  state.menuFilterCategory = category;
  
  // Atualiza classes ativas
  const tabs = document.querySelectorAll('.menu-cat-tab');
  tabs.forEach(tab => {
    tab.classList.remove('active');
    if (tab.textContent.toLowerCase() === category.toLowerCase() || 
        (category === 'all' && tab.textContent === 'Todos') || 
        (category === 'sobremesas' && tab.textContent === 'Doces') ||
        (category === 'porcoes' && tab.textContent === 'Porções') ||
        (category === 'pratos' && tab.textContent === 'Pratos')) {
      tab.classList.add('active');
    }
  });

  const table = getTableById(state.selectedTableId);
  document.getElementById('menu-items-search-grid').innerHTML = renderMenuSearchGrid(table);
}

function changeTableStatus(newStatus) {
  const table = getTableById(state.selectedTableId);
  table.status = newStatus;
  
  saveTablesToStorage();
  updateStats();
  renderTables();
  
  // Atualizar Drawer
  openComandaDrawer(state.selectedTableId);
}

// --- CALCULO DE TOTAIS MESA ---
function calculateTableTotals(table) {
  let subtotal = 0;
  table.items.forEach(item => {
    const menuItem = getMenuItemById(item.menuItemId);
    if (menuItem) {
      subtotal += menuItem.price * item.quantity;
    }
  });
  const serviceFeeAmount = table.serviceFee ? subtotal * 0.1 : 0;
  const discountAmount = table.discount || 0;
  const total = Math.max(0, subtotal + serviceFeeAmount - discountAmount);

  return {
    subtotal: subtotal,
    serviceFeeAmount: serviceFeeAmount,
    discountAmount: discountAmount,
    total: total
  };
}

// --- CHECKOUT MODAL LOGIC ---
function openCheckoutModal() {
  const table = getTableById(state.selectedTableId);
  if (!table || table.items.length === 0) return;

  const totals = calculateTableTotals(table);
  
  document.getElementById('modal-checkout-total').textContent = formatCurrency(totals.total);
  
  // Resetar campos
  state.paymentMethod = null;
  document.querySelectorAll('.payment-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('change-calculator-section').style.display = 'none';
  document.getElementById('cash-received').value = '';
  document.getElementById('cash-change-value').textContent = 'R$ 0,00';

  // Mostrar modal
  document.getElementById('checkout-modal').classList.add('active');
}

function closeCheckoutModal() {
  document.getElementById('checkout-modal').classList.remove('active');
}

function selectPaymentMethod(method) {
  state.paymentMethod = method;
  
  // Atualiza botões
  document.querySelectorAll('.payment-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`pay-${method}`).classList.add('active');

  const changeSection = document.getElementById('change-calculator-section');
  const fiadoSection = document.getElementById('fiado-client-section');
  
  if (method === 'cash') {
    changeSection.style.display = 'block';
    calculateChange();
  } else {
    changeSection.style.display = 'none';
  }

  if (method === 'fiado') {
    if (fiadoSection) fiadoSection.style.display = 'block';
    const select = document.getElementById('fiado-client-select');
    if (select) {
      select.innerHTML = '<option value="avulso">Nome da Mesa (Avulso)</option>' + 
        state.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
  } else {
    if (fiadoSection) fiadoSection.style.display = 'none';
  }
}

function calculateChange() {
  const table = getTableById(state.selectedTableId);
  const totals = calculateTableTotals(table);
  const receivedInput = document.getElementById('cash-received');
  const receivedVal = parseFloat(receivedInput.value) || 0;
  
  const change = Math.max(0, receivedVal - totals.total);
  document.getElementById('cash-change-value').textContent = formatCurrency(change);
}

function confirmPaymentAndReleaseTable() {
  if (!state.paymentMethod) {
    alert("Selecione um método de pagamento.");
    return;
  }

  const table = getTableById(state.selectedTableId);
  const totals = calculateTableTotals(table);

  if (state.paymentMethod === 'fiado') {
    const clientSelect = document.getElementById('fiado-client-select');
    const selectedClientId = clientSelect ? clientSelect.value : null;
    let clientName = table.clientName || `Mesa ${table.id}`;
    
    let client = null;
    if (selectedClientId && selectedClientId !== 'avulso') {
      client = state.clients.find(c => c.id === selectedClientId);
    } else if (table.clientName) {
      client = state.clients.find(c => c.name && c.name.trim().toLowerCase() === table.clientName.trim().toLowerCase());
    }

    if (client) {
      clientName = client.name;
      if (client.limit !== null && client.limit !== undefined) {
        const totalDevido = state.fiados
          .filter(f => f.clientName && f.clientName.trim().toLowerCase() === client.name.trim().toLowerCase())
          .reduce((acc, curr) => acc + curr.total, 0);
        
        if (totalDevido + totals.total > client.limit) {
          alert(`Limite de crédito excedido para o cliente ${client.name}!\n\nLimite Total: ${formatCurrency(client.limit)}\nDébito Atual: ${formatCurrency(totalDevido)}\nDisponível: ${formatCurrency(Math.max(0, client.limit - totalDevido))}\nCompra Atual: ${formatCurrency(totals.total)}\n\nNão é possível fechar esta comanda no Fiado.`);
          return;
        }
      }
    }

    state.fiados.push({
      id: `fiado-${Date.now()}`,
      clientName: clientName,
      tableInfo: table.id === 'balcao' ? 'Venda Balcão' : `Mesa ${String(table.id).padStart(2, '0')}`,
      items: JSON.parse(JSON.stringify(table.items)),
      subtotal: totals.subtotal,
      serviceFeeAmount: totals.serviceFeeAmount,
      discountAmount: totals.discountAmount,
      total: totals.total,
      date: new Date().toISOString()
    });
    saveFiadosToStorage();
  } else {
    // Adiciona ao faturamento do dia se não for fiado
    state.revenueToday += totals.total;
    saveRevenueToStorage();
  }

  if (state.selectedTableId === 'balcao') {
    table.items = [];
    table.discount = 0;
    saveBalcaoToStorage();
  } else {
    // Libera mesa
    table.status = 'free';
    table.clientName = '';
    table.guests = 2;
    table.openedAt = null;
    table.items = [];
    table.discount = 0;
    table.serviceFee = true;
    saveTablesToStorage();
  }

  updateStats();
  renderTables();
  closeDrawerAndModal();
}

// --- IMPRESSÃO DE RECIBOS/CONTAS ---
function printReceiptFromModal() {
  const table = getTableById(state.selectedTableId);
  if (!table) return;

  const totals = calculateTableTotals(table);
  const printArea = document.getElementById('print-area');
  
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  let itemsHtml = table.items.map(item => {
    const menuItem = getMenuItemById(item.menuItemId);
    const itemTotal = menuItem ? menuItem.price * item.quantity : 0;
    return `
      <div class="receipt-item-row">
        <span>${menuItem ? menuItem.name : 'Item Desconhecido'}</span>
        <span>${item.quantity}x</span>
        <span>${formatCurrency(itemTotal)}</span>
      </div>
    `;
  }).join('');

  printArea.innerHTML = `
    <div class="receipt-header">
      <div class="receipt-title">BISTRÔ & COMANDAS</div>
      <div>CNPJ: 00.000.000/0001-00</div>
      <div>Av. Gastronomia, 100 - Centro</div>
    </div>
    <div class="receipt-divider"></div>
    <div class="receipt-row">
      <span>MESA: ${String(table.id).padStart(2, '0')}</span>
      <span>HORA: ${dateFormatted}</span>
    </div>
    <div class="receipt-row">
      <span>CLIENTE: ${table.clientName || 'NÃO INFORMADO'}</span>
    </div>
    <div class="receipt-divider"></div>
    <div class="receipt-item-row" style="font-weight: bold;">
      <span>Item</span>
      <span>Qtd</span>
      <span style="text-align: right;">Total</span>
    </div>
    <div class="receipt-divider"></div>
    ${itemsHtml}
    <div class="receipt-divider"></div>
    <div class="receipt-row">
      <span>Subtotal:</span>
      <span>${formatCurrency(totals.subtotal)}</span>
    </div>
    ${table.serviceFee ? `
    <div class="receipt-row">
      <span>Taxa de Serviço (10%):</span>
      <span>${formatCurrency(totals.serviceFeeAmount)}</span>
    </div>` : ''}
    ${totals.discountAmount > 0 ? `
    <div class="receipt-row">
      <span>Descontos:</span>
      <span>-${formatCurrency(totals.discountAmount)}</span>
    </div>` : ''}
    <div class="receipt-total">
      <span>TOTAL GERAL:</span>
      <span>${formatCurrency(totals.total)}</span>
    </div>
    <div class="receipt-divider"></div>
    <div class="receipt-footer">
      <div>Obrigado pela preferência!</div>
      <div>Volte sempre.</div>
    </div>
  `;

  // Executa impressão
  window.print();
}


// --- GERENCIAMENTO DO CARDÁPIO (MENU EDITOR) ---
function renderMenuEditor() {
  const container = document.getElementById('editor-items-container');
  container.innerHTML = '';

  const filterCategory = state.menuFilterCategory;
  let items = state.menu;

  if (filterCategory !== 'all') {
    items = items.filter(item => item.category === filterCategory);
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/></svg>
        <p>Nenhum item de cardápio encontrado nesta categoria.</p>
      </div>
    `;
    return;
  }

  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'editor-item-row';
    
    // Traduzir categorias de cardápio
    let catText = item.category;
    if (item.category === 'entradas') catText = 'Entrada';
    if (item.category === 'pratos') catText = 'Prato Principal';
    if (item.category === 'porcoes') catText = 'Porção';
    if (item.category === 'bebidas') catText = 'Bebida';
    if (item.category === 'sobremesas') catText = 'Sobremesa';

    const imageHtml = item.image ? `<img src="${item.image}" class="menu-item-image-thumb">` : `<div class="menu-item-image-thumb" style="display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="var(--text-tertiary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>`;

    row.innerHTML = `
      <div class="editor-item-info" style="display: flex; align-items: center; gap: 12px; width: 100%; min-width: 0;">
        ${imageHtml}
        <div style="flex-grow: 1; min-width: 0; overflow: hidden;">
          <div class="editor-item-title">
            <span>${item.name}</span>
            <span class="editor-category-badge">${catText}</span>
          </div>
          <div class="editor-item-desc">${item.description || 'Sem descrição.'}</div>
          <div class="editor-item-price">${formatCurrency(item.price)}</div>
        </div>
      </div>
      <div class="editor-item-actions">
        <button class="btn-icon" onclick="startEditMenuItem('${item.id}')" title="Editar item">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        </button>
        <button class="btn-icon danger" onclick="handleDeleteMenuItem('${item.id}')" title="Remover item">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        </button>
      </div>
    `;
    container.appendChild(row);
  });
}

function filterEditorMenu(category) {
  state.menuFilterCategory = category;
  
  // Atualiza botões ativos no filtro do editor
  const filterDiv = document.getElementById('menu-editor-filter');
  const buttons = filterDiv.querySelectorAll('.filter-btn');
  
  buttons.forEach(btn => {
    btn.classList.remove('active');
    
    // Traduzir filtros para encontrar o botão correspondente
    const btnText = btn.textContent.toLowerCase();
    if ((category === 'all' && btnText === 'todos') ||
        (category === 'entradas' && btnText === 'entradas') ||
        (category === 'pratos' && btnText === 'pratos') ||
        (category === 'porcoes' && btnText === 'porções') ||
        (category === 'bebidas' && btnText === 'bebidas') ||
        (category === 'sobremesas' && btnText === 'sobremesas')) {
      btn.classList.add('active');
    }
  });

  renderMenuEditor();
}

function handleSaveMenuItem(e) {
  e.preventDefault();
  
  const idInput = document.getElementById('form-item-id');
  const nameInput = document.getElementById('form-name');
  const catSelect = document.getElementById('form-category');
  const priceInput = document.getElementById('form-price');
  const descInput = document.getElementById('form-description');
  const imageBase64 = document.getElementById('form-image-base64').value;

  const itemId = idInput.value;
  const name = nameInput.value.trim();
  const category = catSelect.value;
  const price = parseFloat(priceInput.value) || 0.00;
  const description = descInput.value.trim();

  if (itemId) {
    // Editar
    const item = getMenuItemById(itemId);
    if (item) {
      item.name = name;
      item.category = category;
      item.price = price;
      item.description = description;
      item.image = imageBase64;
    }
  } else {
    // Novo
    const newId = `custom-${Date.now()}`;
    state.menu.push({
      id: newId,
      name: name,
      category: category,
      price: price,
      description: description,
      image: imageBase64
    });
  }

  saveMenuToStorage();
  resetMenuForm();
  renderMenuEditor();
}

function startEditMenuItem(id) {
  const item = getMenuItemById(id);
  if (!item) return;

  state.editingMenuItemId = id;
  
  document.getElementById('form-item-id').value = item.id;
  document.getElementById('form-name').value = item.name;
  document.getElementById('form-category').value = item.category;
  document.getElementById('form-price').value = item.price;
  document.getElementById('form-description').value = item.description || '';

  if (item.image) {
    document.getElementById('form-image-base64').value = item.image;
    document.getElementById('image-preview').src = item.image;
    document.getElementById('image-preview').style.display = 'block';
    document.getElementById('image-preview-placeholder').style.display = 'none';
    document.getElementById('btn-remove-image').style.display = 'flex';
  } else {
    if (typeof removeImage === 'function') removeImage();
  }

  document.getElementById('form-item-title').textContent = "Editar Item de Cardápio";
  document.getElementById('btn-save-item').textContent = "Atualizar Item";
  document.getElementById('btn-cancel-edit').style.display = 'inline-flex';
}

function resetMenuForm() {
  state.editingMenuItemId = null;
  
  document.getElementById('menu-item-form').reset();
  if (typeof removeImage === 'function') removeImage();
  
  document.getElementById('form-item-id').value = '';
  document.getElementById('form-item-title').textContent = "Novo Item de Cardápio";
  document.getElementById('btn-save-item').textContent = "Adicionar Item";
  document.getElementById('btn-cancel-edit').style.display = 'none';
}

function handleDeleteMenuItem(id) {
  // Verifica se o item está sendo usado em alguma comanda ativa
  const isUsed = state.tables.some(table => {
    if (table.status === 'free') return false;
    return table.items.some(orderItem => orderItem.menuItemId === id);
  });

  if (isUsed) {
    alert("Este item não pode ser deletado pois está presente em uma mesa ativa.");
    return;
  }

  if (confirm("Tem certeza que deseja remover este item do cardápio?")) {
    state.menu = state.menu.filter(item => item.id !== id);
    saveMenuToStorage();
    renderMenuEditor();
  }
}

// --- GERENCIAMENTO DE USUÁRIOS ---
function saveUsersToStorage() {
  localStorage.setItem('bistro_users', JSON.stringify(state.users));
}

function switchSettingsTab(tabName) {
  document.querySelectorAll('.settings-nav-link').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.settings-tab').forEach(tab => tab.classList.remove('active'));

  document.getElementById(`settings-nav-${tabName}`).classList.add('active');
  document.getElementById(`settings-tab-${tabName}`).classList.add('active');
}

function getRoleLabel(role) {
  const roles = {
    admin: 'Administrador',
    manager: 'Gerente',
    waiter: 'Garçom',
    cashier: 'Caixa'
  };
  return roles[role] || role;
}

function getRoleBadgeClass(role) {
  const classes = {
    admin: 'role-admin',
    manager: 'role-manager',
    waiter: 'role-waiter',
    cashier: 'role-cashier'
  };
  return classes[role] || '';
}

function renderUsersTable() {
  const tbody = document.getElementById('users-table-body');
  const table = document.getElementById('users-table');
  const emptyState = document.getElementById('users-empty-state');

  if (!tbody) return;

  if (state.users.length === 0) {
    table.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }

  table.style.display = 'table';
  emptyState.style.display = 'none';
  tbody.innerHTML = '';

  state.users.forEach(user => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="user-cell">
          <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
          <span class="user-name-text">${user.name}</span>
        </div>
      </td>
      <td>${user.email}</td>
      <td><span class="role-badge ${getRoleBadgeClass(user.role)}">${getRoleLabel(user.role)}</span></td>
      <td><span class="status-badge ${user.status === 'active' ? 'status-active' : 'status-inactive'}">${user.status === 'active' ? 'Ativo' : 'Inativo'}</span></td>
      <td>
        <div class="table-actions">
          <button class="btn-icon" onclick="editUser('${user.id}')" title="Editar usuário">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button class="btn-icon danger" onclick="deleteUser('${user.id}')" title="Remover usuário">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openUserModal(userId) {
  state.editingUserId = userId || null;
  const form = document.getElementById('user-form');
  form.reset();
  document.getElementById('user-form-id').value = '';

  if (userId) {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('user-modal-title').textContent = 'Editar Usuário';
    document.getElementById('btn-save-user').textContent = 'Atualizar Usuário';
    document.getElementById('user-form-id').value = user.id;
    document.getElementById('user-form-name').value = user.name;
    document.getElementById('user-form-email').value = user.email;
    document.getElementById('user-form-role').value = user.role;
    document.getElementById('user-form-status').value = user.status;
    document.getElementById('user-form-password').removeAttribute('required');
    document.getElementById('user-form-password').placeholder = 'Deixe em branco para manter';
  } else {
    document.getElementById('user-modal-title').textContent = 'Novo Usuário';
    document.getElementById('btn-save-user').textContent = 'Cadastrar Usuário';
    document.getElementById('user-form-password').setAttribute('required', 'required');
    document.getElementById('user-form-password').placeholder = 'Mínimo 6 caracteres';
  }

  document.getElementById('overlay').classList.add('active');
  document.getElementById('user-modal').classList.add('active');
}

function closeUserModal() {
  document.getElementById('user-modal').classList.remove('active');
  document.getElementById('overlay').classList.remove('active');
  state.editingUserId = null;
}

function editUser(userId) {
  openUserModal(userId);
}

function handleSaveUser(e) {
  e.preventDefault();

  const id = document.getElementById('user-form-id').value;
  const name = document.getElementById('user-form-name').value.trim();
  const email = document.getElementById('user-form-email').value.trim();
  const role = document.getElementById('user-form-role').value;
  const status = document.getElementById('user-form-status').value;
  const password = document.getElementById('user-form-password').value;

  if (id) {
    const user = state.users.find(u => u.id === id);
    if (user) {
      user.name = name;
      user.email = email;
      user.role = role;
      user.status = status;
      if (password) user.password = password;
    }
  } else {
    const newUser = {
      id: `user-${Date.now()}`,
      name,
      email,
      role,
      status,
      password,
      createdAt: new Date().toISOString()
    };
    state.users.push(newUser);
  }

  saveUsersToStorage();
  renderUsersTable();
  closeUserModal();
}

function deleteUser(userId) {
  if (confirm('Tem certeza que deseja remover este usuário?')) {
    state.users = state.users.filter(u => u.id !== userId);
    saveUsersToStorage();
    renderUsersTable();
  }
}

// --- CLIENTES E FIADOS ---
function handleSaveClient(e) {
  e.preventDefault();
  const name = document.getElementById('client-name').value.trim();
  const phone = document.getElementById('client-phone').value.trim();
  const address = document.getElementById('client-address').value.trim();
  const paydateInput = document.getElementById('client-paydate');
  const paydate = paydateInput ? paydateInput.value.trim() : '';
  const limitInput = document.getElementById('client-limit');
  const limit = limitInput && limitInput.value ? parseFloat(limitInput.value) : null;

  const newClient = {
    id: `client-${Date.now()}`,
    name,
    phone,
    address,
    paydate,
    limit,
    createdAt: new Date().toISOString()
  };

  state.clients.push(newClient);
  saveClientsToStorage();
  
  document.getElementById('client-form').reset();
  renderClientsList();
}

function renderClientsList() {
  const container = document.getElementById('clients-list');
  if (!container) return;

  if (state.clients.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-tertiary); padding: 12px 0;">Nenhum cliente cadastrado.</div>`;
    return;
  }

  container.innerHTML = state.clients.map(client => `
    <div style="border: 1px solid var(--border); padding: 12px; border-radius: 6px; background: var(--bg-primary);">
      <div style="font-weight: 600; margin-bottom: 4px;">${client.name}</div>
      ${client.phone ? `<div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 2px;">📞 ${client.phone}</div>` : ''}
      ${client.address ? `<div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 2px;">📍 ${client.address}</div>` : ''}
      ${client.paydate ? `<div style="font-size: 0.85rem; color: var(--text-secondary);">🗓️ Vencimento: ${client.paydate}</div>` : ''}
      ${client.limit !== null && client.limit !== undefined ? `<div style="font-size: 0.85rem; color: var(--color-paying); font-weight: 700; margin-top: 4px;">💳 Limite: ${formatCurrency(client.limit)}</div>` : ''}
    </div>
  `).join('');
}

function renderFiadosList() {
  const container = document.getElementById('fiados-list-container');
  if (!container) return;

  if (!state.fiados || state.fiados.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-tertiary); padding: 24px 0;">Nenhum fiado pendente.</div>`;
    return;
  }

  // Garante que todo fiado tenha um ID válido e persiste se necessário
  let needsSave = false;
  state.fiados.forEach((f, idx) => {
    if (!f.id) {
      f.id = `fiado-${Date.now()}-${idx}`;
      needsSave = true;
    }
  });
  if (needsSave) saveFiadosToStorage();

  container.innerHTML = state.fiados.map((fiado, index) => {
    const fiadoId = fiado.id || `fiado-${index}`;
    const date = new Date(fiado.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' });
    
    let expectedPayDate = '';
    const client = state.clients.find(c => c.name === fiado.clientName);
    if (client && client.paydate) {
      expectedPayDate = `<div style="font-size: 0.85rem; color: var(--color-paying); margin-top: 4px; font-weight: 600;">🗓️ Vencimento: ${client.paydate}</div>`;
    }

    let itemsConsumedHtml = '';
    if (fiado.items && fiado.items.length > 0) {
      const itemsRows = fiado.items.map(item => {
        const menuItem = getMenuItemById(item.menuItemId);
        const itemTotal = menuItem ? menuItem.price * item.quantity : 0;
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.88rem; padding: 4px 0; border-bottom: 1px dashed var(--border);">
            <span><strong>${item.quantity}x</strong> ${menuItem ? menuItem.name : 'Item Desconhecido'}</span>
            <span style="font-weight: 600; color: var(--text-primary);">${formatCurrency(itemTotal)}</span>
          </div>
        `;
      }).join('');

      itemsConsumedHtml = `
        <div style="margin-top: 12px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 6px; padding: 10px 14px;">
          <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: 0.05em; margin-bottom: 6px;">Itens Consumidos:</div>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            ${itemsRows}
          </div>
          ${fiado.serviceFeeAmount > 0 ? `
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary); margin-top: 6px; padding-top: 4px;">
              <span>Taxa de Serviço (10%):</span>
              <span>${formatCurrency(fiado.serviceFeeAmount)}</span>
            </div>
          ` : ''}
          ${fiado.discountAmount > 0 ? `
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #ef4444; margin-top: 2px;">
              <span>Desconto:</span>
              <span>-${formatCurrency(fiado.discountAmount)}</span>
            </div>
          ` : ''}
        </div>
      `;
    }

    return `
    <div style="border: 1px solid var(--border); padding: 18px; border-radius: 8px; background: var(--bg-primary); margin-bottom: 16px; box-shadow: var(--shadow-sm); min-width: 0;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
        <div style="min-width: 0;">
          <div style="font-weight: 700; font-size: 1.15rem; color: var(--text-primary); word-break: break-word;">${fiado.clientName}</div>
          <div style="font-size: 0.85rem; color: var(--text-tertiary); margin-top: 4px;">🕒 Data: ${date}</div>
          <div style="font-size: 0.85rem; color: var(--text-tertiary);">📍 Origem: ${fiado.tableInfo}</div>
          ${expectedPayDate}
        </div>
        <div style="text-align: right; margin-left: auto;">
          <div style="font-size: 0.72rem; text-transform: uppercase; font-weight: 700; color: var(--text-tertiary);">Total a Pagar</div>
          <div style="color: var(--color-paying); font-weight: 800; font-size: 1.35rem;">${formatCurrency(fiado.total)}</div>
          <div style="display: flex; gap: 8px; margin-top: 8px; justify-content: flex-end; flex-wrap: wrap;">
            <button class="action-btn secondary" style="padding: 6px 12px; font-size: 0.82rem;" onclick="printFiadoReceipt('${fiadoId}')" title="Imprimir comprovante">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
              Imprimir
            </button>
            <button class="action-btn" style="padding: 6px 14px; font-size: 0.85rem;" onclick="payFiado('${fiadoId}')">Quitar Dívida</button>
          </div>
        </div>
      </div>
      ${itemsConsumedHtml}
    </div>
  `}).join('');
}

function printFiadoReceipt(fiadoId) {
  let fiado = state.fiados.find(f => f.id === fiadoId || String(f.id) === String(fiadoId));
  if (!fiado && state.fiados.length > 0) {
    const idx = parseInt(fiadoId, 10);
    if (!isNaN(idx) && state.fiados[idx]) fiado = state.fiados[idx];
  }
  if (!fiado) return;

  const printArea = document.getElementById('print-area');
  const now = new Date(fiado.date);
  const dateFormatted = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  let itemsHtml = (fiado.items || []).map(item => {
    const menuItem = getMenuItemById(item.menuItemId);
    const itemTotal = menuItem ? menuItem.price * item.quantity : 0;
    return `
      <div class="receipt-item-row">
        <span>${menuItem ? menuItem.name : 'Item Desconhecido'}</span>
        <span>${item.quantity}x</span>
        <span>${formatCurrency(itemTotal)}</span>
      </div>
    `;
  }).join('');

  printArea.innerHTML = `
    <div class="receipt-header">
      <div class="receipt-title">COMPROVANTE DE FIADO</div>
      <div>BISTRÔ & COMANDAS</div>
      <div>Av. Gastronomia, 100 - Centro</div>
    </div>
    <div class="receipt-divider"></div>
    <div class="receipt-row">
      <span>CLIENTE: ${fiado.clientName}</span>
      <span>${fiado.tableInfo}</span>
    </div>
    <div class="receipt-row">
      <span>DATA: ${dateFormatted}</span>
    </div>
    <div class="receipt-divider"></div>
    <div class="receipt-item-row" style="font-weight: bold;">
      <span>Item</span>
      <span>Qtd</span>
      <span style="text-align: right;">Total</span>
    </div>
    <div class="receipt-divider"></div>
    ${itemsHtml || '<div style="text-align:center; padding: 4px;">Consumo registrado</div>'}
    <div class="receipt-divider"></div>
    ${fiado.serviceFeeAmount > 0 ? `
    <div class="receipt-row">
      <span>Taxa de Serviço (10%):</span>
      <span>${formatCurrency(fiado.serviceFeeAmount)}</span>
    </div>` : ''}
    ${fiado.discountAmount > 0 ? `
    <div class="receipt-row">
      <span>Desconto:</span>
      <span>-${formatCurrency(fiado.discountAmount)}</span>
    </div>` : ''}
    <div class="receipt-total">
      <span>TOTAL DEVIDO:</span>
      <span>${formatCurrency(fiado.total)}</span>
    </div>
    <div class="receipt-divider"></div>
    <div class="receipt-footer" style="margin-top: 30px;">
      <div style="border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 4px;">Assinatura do Cliente</div>
    </div>
  `;

  window.print();
}

let currentFiadoPayMethod = 'cash';

function selectFiadoPayMethod(method) {
  currentFiadoPayMethod = method;
  ['cash', 'pix', 'card'].forEach(m => {
    const btn = document.getElementById(`fiado-pay-btn-${m}`);
    if (btn) {
      if (m === method) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });
}

function payFiado(fiadoId) {
  openPayFiadoModal(fiadoId);
}

function openPayFiadoModal(fiadoId) {
  // Busca fiado por ID exato ou string
  let fiado = state.fiados.find(f => f.id && (f.id === fiadoId || String(f.id) === String(fiadoId)));
  
  // Fallbacks para garantir que nunca falhe
  if (!fiado && state.fiados.length > 0) {
    const idx = parseInt(fiadoId, 10);
    if (!isNaN(idx) && state.fiados[idx]) {
      fiado = state.fiados[idx];
    } else if (state.fiados.length === 1) {
      fiado = state.fiados[0];
    }
  }

  if (!fiado) {
    console.error("Fiado não encontrado:", fiadoId, state.fiados);
    alert('Não foi possível localizar este fiado.');
    return;
  }

  const modal = document.getElementById('pay-fiado-modal');
  const overlay = document.getElementById('overlay');
  if (!modal || !overlay) {
    console.error("Elementos #pay-fiado-modal ou #overlay não encontrados no DOM.");
    return;
  }

  const dateFormatted = new Date(fiado.date).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const idInput = document.getElementById('modal-fiado-id');
  const clientEl = document.getElementById('modal-fiado-client');
  const originEl = document.getElementById('modal-fiado-origin');
  const dateEl = document.getElementById('modal-fiado-date');
  const totalEl = document.getElementById('modal-fiado-total');

  if (idInput) idInput.value = fiado.id;
  if (clientEl) clientEl.textContent = fiado.clientName || 'Cliente';
  if (originEl) originEl.textContent = fiado.tableInfo || 'Autoatendimento';
  if (dateEl) dateEl.textContent = dateFormatted;
  if (totalEl) totalEl.textContent = formatCurrency(fiado.total);

  selectFiadoPayMethod('cash');

  overlay.classList.add('active');
  modal.classList.add('active');
}

function closePayFiadoModal() {
  const modal = document.getElementById('pay-fiado-modal');
  const overlay = document.getElementById('overlay');
  if (modal) modal.classList.remove('active');
  if (overlay) overlay.classList.remove('active');
}

function confirmPayFiadoFromModal() {
  const idInput = document.getElementById('modal-fiado-id');
  const fiadoId = idInput ? idInput.value : '';
  
  let fiadoIndex = state.fiados.findIndex(f => f.id === fiadoId || String(f.id) === String(fiadoId));
  
  if (fiadoIndex === -1 && state.fiados.length === 1) {
    fiadoIndex = 0;
  }

  if (fiadoIndex === -1) {
    alert('Erro ao localizar o fiado para quitação.');
    closePayFiadoModal();
    return;
  }

  const fiado = state.fiados[fiadoIndex];

  // Incrementa o faturamento do dia
  state.revenueToday = (state.revenueToday || 0) + (fiado.total || 0);
  saveRevenueToStorage();
  updateStats();

  // Remove da lista de fiados
  state.fiados.splice(fiadoIndex, 1);
  saveFiadosToStorage();

  closePayFiadoModal();
  renderFiadosList();

  // Exibe notificação toast elegante
  showFiadoSuccessToast(`Débito de ${formatCurrency(fiado.total)} do cliente "${fiado.clientName}" quitado com sucesso!`);
}

// Vincula funções ao escopo global window para garantir funcionamento em qualquer contexto
window.payFiado = payFiado;
window.openPayFiadoModal = openPayFiadoModal;
window.closePayFiadoModal = closePayFiadoModal;
window.selectFiadoPayMethod = selectFiadoPayMethod;
window.confirmPayFiadoFromModal = confirmPayFiadoFromModal;
window.printFiadoReceipt = printFiadoReceipt;

function showFiadoSuccessToast(message) {
  const toast = document.createElement('div');
  toast.className = 'fiado-toast-success';
  toast.innerHTML = `
    <div class="toast-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// --- IMAGE UPLOAD LOGIC ---
function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 400;
      const MAX_HEIGHT = 400;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      
      document.getElementById('form-image-base64').value = dataUrl;
      document.getElementById('image-preview').src = dataUrl;
      document.getElementById('image-preview').style.display = 'block';
      document.getElementById('image-preview-placeholder').style.display = 'none';
      document.getElementById('btn-remove-image').style.display = 'flex';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removeImage() {
  document.getElementById('form-image-base64').value = '';
  document.getElementById('image-preview').src = '';
  document.getElementById('image-preview').style.display = 'none';
  document.getElementById('image-preview-placeholder').style.display = 'flex';
  document.getElementById('btn-remove-image').style.display = 'none';
  document.getElementById('form-image-input').value = '';
}

// ==========================================================================
// GESTÃO DE PEDIDOS (KDS / COZINHA & BALCÃO)
// ==========================================================================

function updatePendingOrdersBadge() {
  const badge = document.getElementById('orders-badge-count');
  if (!badge) return;

  const pendingCount = state.orders.filter(o => o.status === 'preparing').length;
  if (pendingCount > 0) {
    badge.textContent = pendingCount.toString();
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

function filterOrdersStatus(status) {
  state.ordersFilterStatus = status;

  ['all', 'preparing', 'ready', 'delivered'].forEach(s => {
    const btn = document.getElementById(`filter-order-${s}`);
    if (btn) {
      btn.classList.toggle('active', s === status);
    }
  });

  renderOrdersManagement();
}

function setOrderStatus(orderId, newStatus) {
  const order = state.orders.find(o => o.id === orderId);
  if (order) {
    order.status = newStatus;
    saveOrdersToStorage();
    updatePendingOrdersBadge();
    renderOrdersManagement();
  }
}

function deleteOrder(orderId) {
  if (!confirm('Deseja remover este pedido do histórico?')) return;
  state.orders = state.orders.filter(o => o.id !== orderId);
  saveOrdersToStorage();
  updatePendingOrdersBadge();
  renderOrdersManagement();
}

function renderOrdersManagement() {
  const container = document.getElementById('orders-grid-container');
  if (!container) return;

  loadOrdersFromStorage();
  updatePendingOrdersBadge();

  let orders = state.orders;

  if (state.ordersFilterStatus !== 'all') {
    orders = orders.filter(o => o.status === state.ordersFilterStatus);
  }

  if (orders.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; color: var(--text-tertiary); padding: 48px 20px; background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border);">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 12px;"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z"/><path d="m9 14 2 2 4-4"/></svg>
        <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Nenhum pedido encontrado</h3>
        <p style="font-size: 0.88rem;">Não há pedidos com o status selecionado no momento.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map(order => {
    const timeAgo = getTimeDifference(order.createdAt);
    const dateFormatted = new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let statusLabel = '';
    let statusClass = '';
    let actionButtonsHtml = '';

    if (order.status === 'preparing') {
      statusClass = 'preparing';
      statusLabel = `<span class="order-status-badge preparing">🟡 Em Preparo</span>`;
      actionButtonsHtml = `
        <button class="action-btn" style="background: linear-gradient(135deg, var(--color-free), #059669); width: 100%; justify-content: center;" onclick="setOrderStatus('${order.id}', 'ready')">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          Marcar como Pronto
        </button>
      `;
    } else if (order.status === 'ready') {
      statusClass = 'ready';
      statusLabel = `<span class="order-status-badge ready">🟢 Pronto para Entrega</span>`;
      actionButtonsHtml = `
        <div style="display: flex; gap: 8px; width: 100%;">
          <button class="action-btn" style="flex: 1; justify-content: center;" onclick="setOrderStatus('${order.id}', 'delivered')">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Entregar / Concluir
          </button>
          <button class="action-btn secondary" style="padding: 8px 12px;" onclick="setOrderStatus('${order.id}', 'preparing')" title="Voltar para preparo">
            ↩
          </button>
        </div>
      `;
    } else {
      statusClass = 'delivered';
      statusLabel = `<span class="order-status-badge delivered">⚪ Entregue</span>`;
      actionButtonsHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <span style="font-size: 0.82rem; color: var(--text-tertiary);">Pedido finalizado</span>
          <button class="action-btn secondary" style="font-size: 0.8rem; padding: 5px 10px;" onclick="deleteOrder('${order.id}')">
            Excluir
          </button>
        </div>
      `;
    }

    const itemsHtml = (order.items || []).map(item => {
      const menuItem = getMenuItemById(item.menuItemId);
      const name = menuItem ? menuItem.name : 'Item do Cardápio';
      return `
        <div class="kds-item-row">
          <span class="kds-item-qty">${item.quantity}x</span>
          <span class="kds-item-name">${name}</span>
        </div>
      `;
    }).join('');

    const destinationIcon = order.orderType === 'balcao'
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>`;

    return `
      <div class="kds-order-card ${statusClass}">
        <div class="kds-card-header">
          <div class="kds-ticket-badge">
            ${order.ticketNumber || 'Pedido'}
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            ${statusLabel}
            <span class="kds-time-ago">${timeAgo || dateFormatted}</span>
          </div>
        </div>

        <div class="kds-delivery-banner">
          <div class="kds-delivery-dest">
            ${destinationIcon}
            <span><strong>Onde Entregar:</strong> ${order.destination || order.location || 'Balcão'}</span>
          </div>
          <div class="kds-customer-info">
            <strong>Cliente:</strong> ${order.customerName || 'Não identificado'} ${order.customerPhone ? `(${order.customerPhone})` : ''}
          </div>
        </div>

        <div class="kds-items-box">
          <div class="kds-items-title">Itens do Pedido:</div>
          <div class="kds-items-list">
            ${itemsHtml}
          </div>
          ${order.notes ? `
            <div class="kds-notes-box">
              <strong>Obs:</strong> "${order.notes}"
            </div>
          ` : ''}
        </div>

        <div class="kds-card-footer">
          ${actionButtonsHtml}
        </div>
      </div>
    `;
  }).join('');
}
