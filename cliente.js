// ==========================================================================
// Bistrô & Comandas - Customer Self-Service Application Logic
// ==========================================================================

let clientState = {
  customerName: '',
  customerPhone: '',
  loggedInClient: null, // Objeto do cliente { id, name, phone, limit, paydate }
  authTab: 'login',     // 'login' | 'guest'
  orderType: 'balcao',  // 'balcao' | 'local'
  currentScreen: 'welcome', // 'welcome' | 'account' | 'menu' | 'cart' | 'payment' | 'success'
  category: 'all',
  searchQuery: '',
  cart: [], // Array of { menuItemId, quantity }
  notes: '',
  paymentMethod: 'pix', // 'pix' | 'card' | 'cash' | 'fiado'
  cashChangeFor: '',
  fiadoClientId: '',
  menu: [],
  clients: [],
  lastOrder: null
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initClientApp();
});

function initClientApp() {
  // 1. Carregar tema
  const savedTheme = localStorage.getItem('bistro_theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
  }

  // 2. Carregar Cardápio do LocalStorage com sincronização de imagens
  const savedMenu = localStorage.getItem('bistro_menu');
  if (savedMenu) {
    try {
      clientState.menu = JSON.parse(savedMenu);
    } catch (e) {
      clientState.menu = typeof DEFAULT_MENU !== 'undefined' ? [...DEFAULT_MENU] : [];
    }
    let menuUpdated = false;
    clientState.menu.forEach(item => {
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
      localStorage.setItem('bistro_menu', JSON.stringify(clientState.menu));
    }
  } else if (typeof DEFAULT_MENU !== 'undefined') {
    clientState.menu = [...DEFAULT_MENU];
    localStorage.setItem('bistro_menu', JSON.stringify(clientState.menu));
  }

  // 3. Carregar Clientes cadastrados (para opção de login e fiado)
  loadClientsFromStorage();

  // 4. Ouvir atualizações de outros painéis em tempo real
  window.addEventListener('storage', () => {
    loadClientsFromStorage();
    if (clientState.currentScreen === 'account') {
      renderCustomerAccount();
    }
    if (clientState.currentScreen === 'track') {
      renderTrackScreen();
    }
    if (clientState.currentScreen === 'success') {
      renderSuccessTicket();
    }
    updateLoggedUserHeader();
    updateTrackHeaderBadge();
  });

  // Atualização periódica do status do pedido a cada 2.5s
  setInterval(() => {
    updateTrackHeaderBadge();
    if (clientState.currentScreen === 'track') {
      renderTrackScreen();
    }
    if (clientState.currentScreen === 'success') {
      renderSuccessTicket();
    }
  }, 2500);

  updateTrackHeaderBadge();
  renderMenuGrid();
}

function loadClientsFromStorage() {
  const savedClients = localStorage.getItem('bistro_clients');
  if (savedClients) {
    try {
      clientState.clients = JSON.parse(savedClients);
    } catch (e) {
      clientState.clients = [];
    }
  }
}

// --- AUTHENTICATION & LOGIN TABS ---
function switchAuthTab(tab) {
  clientState.authTab = tab;
  
  const btnLogin = document.getElementById('auth-tab-login');
  const btnGuest = document.getElementById('auth-tab-guest');
  const formLogin = document.getElementById('auth-box-login');
  const formGuest = document.getElementById('auth-box-guest');

  if (tab === 'login') {
    btnLogin.classList.add('active');
    btnGuest.classList.remove('active');
    formLogin.style.display = 'flex';
    formGuest.style.display = 'none';
  } else {
    btnGuest.classList.add('active');
    btnLogin.classList.remove('active');
    formGuest.style.display = 'flex';
    formLogin.style.display = 'none';
  }
}

function handleCustomerLogin(event, goToAccount = false) {
  if (event) event.preventDefault();

  const nameInput = document.getElementById('login-client-name');
  const enteredName = nameInput ? nameInput.value.trim() : '';

  if (!enteredName) {
    alert('Por favor, digite seu nome cadastrado.');
    if (nameInput) nameInput.focus();
    return;
  }

  // Recarrega a lista de clientes para garantir dados em tempo real
  loadClientsFromStorage();

  // Busca cliente pelo nome (comparação insensível a maiúsculas/minúsculas e espaços)
  const clientObj = clientState.clients.find(c => 
    c.name && c.name.trim().toLowerCase() === enteredName.toLowerCase()
  );

  // Se não existir usuário cadastrado com esse nome, BLOQUEIA o login
  if (!clientObj) {
    alert(`Cliente "${enteredName}" não encontrado no cadastro do restaurante. Por favor, verifique a digitação ou faça seu pedido sem login.`);
    if (nameInput) nameInput.focus();
    return;
  }

  // Define cliente logado autenticado
  clientState.loggedInClient = clientObj;
  clientState.customerName = clientObj.name;
  if (clientObj.phone) clientState.customerPhone = clientObj.phone;

  // Atualiza header
  updateLoggedUserHeader();

  // Exibe simulação de login
  simulateLoginAuthAndProceed(clientObj.name, goToAccount);
}

function simulateLoginAuthAndProceed(clientName, goToAccount) {
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'login-auth-overlay';
  modalOverlay.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(6px);
    z-index: 999; display: flex; align-items: center; justify-content: center;
    padding: 20px; animation: fadeIn 0.2s ease;
  `;

  modalOverlay.innerHTML = `
    <div style="background: var(--bg-secondary); border: 2px solid var(--accent); border-radius: var(--radius-lg); padding: 32px 24px; max-width: 400px; width: 100%; text-align: center; box-shadow: var(--shadow-lg);">
      <div id="login-spinner-icon" style="width: 58px; height: 58px; margin: 0 auto 16px; border-radius: 50%; background: var(--accent-light); color: var(--accent); display: flex; align-items: center; justify-content: center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      </div>
      <h3 style="font-family: var(--font-title); font-size: 1.25rem; font-weight: 800; margin-bottom: 6px;">Entrando na Conta...</h3>
      <p style="font-size: 0.9rem; color: var(--text-secondary);">Identificando titular <strong>"${clientName}"</strong>...</p>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  setTimeout(() => {
    modalOverlay.remove();

    // Atualizar cumprimentos
    document.getElementById('menu-greeting-name').textContent = clientName;
    document.getElementById('menu-badge-type').textContent = clientState.orderType === 'balcao' ? 'Para Viagem / Balcão' : 'Comer no Local';

    if (goToAccount) {
      goToScreen('account');
    } else {
      goToScreen('menu');
    }
  }, 700);
}

function getClientDebtAndLimit(clientName) {
  if (!clientName) return null;
  loadClientsFromStorage();
  const client = clientState.clients.find(c => c.name && c.name.trim().toLowerCase() === clientName.trim().toLowerCase());
  if (!client) return null;

  let fiadosList = [];
  try {
    const saved = localStorage.getItem('bistro_fiados');
    if (saved) fiadosList = JSON.parse(saved);
  } catch (e) {
    fiadosList = [];
  }

  const clientFiados = fiadosList.filter(f => f.clientName && f.clientName.trim().toLowerCase() === client.name.trim().toLowerCase());
  const totalDebt = clientFiados.reduce((sum, f) => sum + (f.total || 0), 0);
  const creditLimit = (client.limit !== null && client.limit !== undefined) ? Number(client.limit) : 300.00;
  const availableLimit = creditLimit - totalDebt;

  return {
    client,
    clientFiados,
    totalDebt,
    creditLimit,
    availableLimit
  };
}

function updateLoggedUserHeader() {
  const container = document.getElementById('logged-user-header');
  if (!container) return;

  if (!clientState.loggedInClient) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  const debtInfo = getClientDebtAndLimit(clientState.loggedInClient.name);
  const totalDebt = debtInfo ? debtInfo.totalDebt : 0;
  const availableLimit = debtInfo ? debtInfo.availableLimit : 0;
  const clientName = clientState.loggedInClient.name;

  container.style.display = 'block';
  container.innerHTML = `
    <div class="logged-customer-badge">
      <span>👤 <strong>${clientName}</strong></span>
      <span>| Dívida: <strong style="color: var(--color-paying);">${formatCurrency(totalDebt)}</strong></span>
      <span>| Disponível: <strong style="color: ${availableLimit > 0 ? 'var(--color-free)' : '#ef4444'};">${formatCurrency(Math.max(0, availableLimit))}</strong></span>
      <button type="button" class="btn-badge-action" onclick="goToScreen('account')">Minha Conta</button>
      <button type="button" class="btn-badge-action" style="background: var(--bg-primary); color: var(--text-tertiary);" onclick="logoutCustomer()">Sair</button>
    </div>
  `;
}

function logoutCustomer() {
  clientState.loggedInClient = null;
  clientState.customerName = '';
  clientState.customerPhone = '';
  updateLoggedUserHeader();
  goToScreen('welcome');
}

// --- SCREEN: MINHA CONTA / EXTRATO DE FIADO ---
function renderCustomerAccount() {
  const container = document.getElementById('account-dashboard-container');
  if (!container) return;

  if (!clientState.loggedInClient) {
    goToScreen('welcome');
    return;
  }

  const client = clientState.loggedInClient;
  const debtInfo = getClientDebtAndLimit(client.name);
  const totalDebt = debtInfo ? debtInfo.totalDebt : 0;
  const creditLimit = debtInfo ? debtInfo.creditLimit : 300.00;
  const availableLimit = debtInfo ? debtInfo.availableLimit : 0;
  const clientFiados = debtInfo ? debtInfo.clientFiados : [];

  let extratoHtml = '';
  if (clientFiados.length === 0) {
    extratoHtml = `
      <div style="text-align: center; padding: 32px 16px; color: var(--text-tertiary);">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 8px;"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
        <p style="font-weight: 600;">Você não possui nenhum débito pendente na sua caderneta!</p>
        <span style="font-size: 0.85rem;">Seu crédito de ${formatCurrency(creditLimit)} está 100% livre para novos pedidos.</span>
      </div>
    `;
  } else {
    extratoHtml = clientFiados.map(f => {
      const dateFormatted = new Date(f.date).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      let itemsRows = '';
      if (f.items && f.items.length > 0) {
        itemsRows = f.items.map(item => {
          const menuItem = clientState.menu.find(m => m.id === item.menuItemId);
          const name = menuItem ? menuItem.name : 'Item';
          const price = menuItem ? menuItem.price * item.quantity : 0;
          return `
            <div class="extrato-item-line">
              <span><strong>${item.quantity}x</strong> ${name}</span>
              <span>${formatCurrency(price)}</span>
            </div>
          `;
        }).join('');
      } else {
        itemsRows = `<div style="font-size: 0.85rem; color: var(--text-tertiary);">Consumo avulso / comanda</div>`;
      }

      return `
        <div class="extrato-card">
          <div class="extrato-card-top">
            <div>
              <div class="extrato-origin">📍 ${f.tableInfo || 'Autoatendimento'}</div>
              <div class="extrato-date">🕒 ${dateFormatted}</div>
            </div>
            <div class="extrato-val">${formatCurrency(f.total)}</div>
          </div>
          <div class="extrato-items-box">
            <div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: 0.05em; margin-bottom: 4px;">Itens do Pedido:</div>
            ${itemsRows}
          </div>
        </div>
      `;
    }).join('');
  }

  container.innerHTML = `
    <!-- Top Welcome Card -->
    <div class="account-welcome-box">
      <div>
        <div class="account-user-title">Caderneta de ${client.name}</div>
        <div class="account-user-subtitle">${client.phone ? `📱 ${client.phone} • ` : ''}Conta vinculada ao Bistrô</div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn-secondary" style="padding: 8px 14px; font-size: 0.85rem;" onclick="logoutCustomer()">Trocar Conta</button>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="account-stats-grid">
      <div class="account-stat-card debt">
        <span class="account-stat-label">Total Devido Atual</span>
        <span class="account-stat-value debt">${formatCurrency(totalDebt)}</span>
        <span class="account-stat-hint">${clientFiados.length} ${clientFiados.length === 1 ? 'compra pendente' : 'compras pendentes'}</span>
      </div>

      <div class="account-stat-card available">
        <span class="account-stat-label">Limite Disponível</span>
        <span class="account-stat-value available">${formatCurrency(availableLimit)}</span>
        <span class="account-stat-hint">Limite Total: ${formatCurrency(creditLimit)}</span>
      </div>

      <div class="account-stat-card">
        <span class="account-stat-label">Data de Vencimento</span>
        <span class="account-stat-value" style="font-size: 1.35rem; color: var(--text-primary);">${client.paydate || 'Todo dia 10'}</span>
        <span class="account-stat-hint">Acerto no balcão ou PIX</span>
      </div>
    </div>

    <!-- Extrato Detalhado -->
    <div class="extrato-container">
      <div class="extrato-header">
        <h3 class="extrato-title">Extrato de Compras na Caderneta</h3>
        <span style="font-size: 0.85rem; font-weight: 700; color: var(--color-paying);">${formatCurrency(totalDebt)} em aberto</span>
      </div>
      <div class="extrato-list">
        ${extratoHtml}
      </div>
    </div>

    <!-- Actions Row -->
    <div class="account-actions-row">
      <button class="btn-primary-large" onclick="goToScreen('menu')">
        🛍️ Fazer Pedido no Fiado
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
      </button>
      ${totalDebt > 0 ? `
        <button class="btn-secondary" onclick="showPixForDebtPayment(${totalDebt})">
          📱 Pagar Conta via PIX
        </button>
      ` : ''}
    </div>
  `;
}

function showPixForDebtPayment(totalDebt) {
  const pixPayload = `00020126580014br.gov.bcb.pix0136bistro-gestao-pagamentos@bistro.com520400005303986540${totalDebt.toFixed(2)}5802BR5916BISTRO COMANDAS6009SAO PAULO62070503***6304`;

  const modal = document.createElement('div');
  modal.id = 'pix-debt-modal';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(6px);
    z-index: 999; display: flex; align-items: center; justify-content: center;
    padding: 20px; animation: fadeIn 0.2s ease;
  `;

  modal.innerHTML = `
    <div style="background: var(--bg-secondary); border: 2px solid var(--accent); border-radius: var(--radius-lg); padding: 28px 24px; max-width: 440px; width: 100%; text-align: center; box-shadow: var(--shadow-lg);">
      <h3 style="font-family: var(--font-title); font-size: 1.25rem; font-weight: 800; margin-bottom: 6px;">Pagar Caderneta via PIX</h3>
      <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 16px;">Valor total devido: <strong style="color: var(--color-paying); font-size: 1.1rem;">${formatCurrency(totalDebt)}</strong></p>

      <div class="pix-qr-canvas-wrap" style="margin: 0 auto 16px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 200 200">
          <rect width="200" height="200" fill="#ffffff"/>
          <rect x="20" y="20" width="50" height="50" fill="#000000"/>
          <rect x="30" y="30" width="30" height="30" fill="#ffffff"/>
          <rect x="38" y="38" width="14" height="14" fill="#000000"/>
          
          <rect x="130" y="20" width="50" height="50" fill="#000000"/>
          <rect x="140" y="30" width="30" height="30" fill="#ffffff"/>
          <rect x="148" y="38" width="14" height="14" fill="#000000"/>
          
          <rect x="20" y="130" width="50" height="50" fill="#000000"/>
          <rect x="30" y="140" width="30" height="30" fill="#ffffff"/>
          <rect x="38" y="148" width="14" height="14" fill="#000000"/>
          
          <rect x="85" y="25" width="25" height="15" fill="#000000"/>
          <rect x="85" y="55" width="30" height="15" fill="#000000"/>
          <rect x="85" y="85" width="30" height="30" fill="#000000"/>
          <rect x="130" y="85" width="45" height="15" fill="#000000"/>
          <rect x="25" y="85" width="45" height="20" fill="#000000"/>
          <rect x="130" y="120" width="20" height="40" fill="#000000"/>
          <rect x="160" y="145" width="20" height="25" fill="#000000"/>
          <rect x="85" y="130" width="30" height="40" fill="#000000"/>
        </svg>
      </div>

      <div class="pix-code-row" style="margin-bottom: 16px;">
        <input type="text" class="search-box-input" readonly value="${pixPayload}" id="modal-pix-copy" style="font-size: 0.78rem;">
        <button type="button" class="btn-primary-large" style="width: auto; padding: 10px 14px; font-size: 0.85rem; margin: 0;" onclick="copyModalPix()">
          Copiar
        </button>
      </div>

      <button type="button" class="btn-secondary" style="width: 100%; justify-content: center;" onclick="document.getElementById('pix-debt-modal').remove()">
        Fechar
      </button>
    </div>
  `;

  document.body.appendChild(modal);
}

function copyModalPix() {
  const input = document.getElementById('modal-pix-copy');
  if (input) {
    input.select();
    navigator.clipboard.writeText(input.value);
    alert('Código PIX Copiado com Sucesso!');
  }
}

// --- NAVIGATION & SCREENS ---
function goToScreen(screenName) {
  clientState.currentScreen = screenName;

  // Esconder todas as telas
  document.querySelectorAll('.step-screen').forEach(el => el.classList.remove('active'));

  // Exibir tela atual
  const target = document.getElementById(`screen-${screenName}`);
  if (target) target.classList.add('active');

  // Atualizar Stepper
  updateStepper(screenName);

  // Ações ao entrar em cada tela
  if (screenName === 'menu') {
    renderMenuGrid();
    updateFloatingCartBar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (screenName === 'account') {
    renderCustomerAccount();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (screenName === 'cart') {
    if (clientState.cart.length === 0) {
      alert('Seu carrinho está vazio! Escolha itens no cardápio.');
      goToScreen('menu');
      return;
    }
    renderCartReview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (screenName === 'payment') {
    renderPaymentDetails();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (screenName === 'success') {
    renderSuccessTicket();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (screenName === 'track') {
    renderTrackScreen();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Atualizar badge de rastreamento no topo
  updateTrackHeaderBadge();

  // Esconder floating bar se não estiver no menu
  const floatingBar = document.getElementById('floating-cart-bar');
  if (floatingBar) {
    if (screenName === 'menu' && getCartItemCount() > 0) {
      floatingBar.classList.add('visible');
    } else {
      floatingBar.classList.remove('visible');
    }
  }
}

function updateStepper(screenName) {
  const stepMap = {
    welcome: 1,
    menu: 2,
    cart: 3,
    payment: 4,
    success: 4,
    track: 4
  };

  const stepperBar = document.getElementById('stepper-bar');
  if (!stepperBar) return;

  if (screenName === 'account' || screenName === 'login' || screenName === 'success' || screenName === 'track') {
    stepperBar.style.display = 'none';
    return;
  }

  stepperBar.style.display = 'flex';
  const currentStepNum = stepMap[screenName] || 1;

  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`step-nav-${i}`);
    if (el) {
      el.classList.remove('active', 'completed');
      if (i === currentStepNum) {
        el.classList.add('active');
      } else if (i < currentStepNum) {
        el.classList.add('completed');
      }
    }
  }
}

// --- SCREEN 1: GUEST IDENTIFICATION ---
function selectOrderType(type) {
  clientState.orderType = type;
  
  // Atualiza botões nos dois formulários
  ['type-balcao', 'login-type-balcao'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('active', type === 'balcao');
  });

  ['type-local', 'login-type-local'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('active', type === 'local');
  });
}

function handleStartOrder(event) {
  if (event) event.preventDefault();
  const nameInput = document.getElementById('customer-name');
  const phoneInput = document.getElementById('customer-phone');

  const name = nameInput ? nameInput.value.trim() : '';
  if (!name) {
    alert('Por favor, informe seu nome.');
    if (nameInput) nameInput.focus();
    return;
  }

  clientState.loggedInClient = null;
  clientState.customerName = name;
  clientState.customerPhone = phoneInput ? phoneInput.value.trim() : '';

  updateLoggedUserHeader();

  // Atualizar cabeçalho do menu
  document.getElementById('menu-greeting-name').textContent = name;
  document.getElementById('menu-badge-type').textContent = clientState.orderType === 'balcao' ? 'Para Viagem / Balcão' : 'Comer no Local';

  goToScreen('menu');
}

// --- SCREEN 2: INTERACTIVE MENU & SEARCH ---
function handleCustomerSearch(query) {
  clientState.searchQuery = query;
  renderMenuGrid();
}

function filterCustomerCategory(category) {
  clientState.category = category;

  // Atualizar classe ativa nas pílulas
  const pills = document.querySelectorAll('.cat-pill');
  pills.forEach(pill => {
    pill.classList.remove('active');
    const text = pill.textContent.toLowerCase();
    if (
      (category === 'all' && text.includes('todos')) ||
      (category === 'entradas' && text.includes('entradas')) ||
      (category === 'pratos' && text.includes('pratos')) ||
      (category === 'porcoes' && text.includes('porções')) ||
      (category === 'bebidas' && text.includes('bebidas')) ||
      (category === 'sobremesas' && text.includes('doces'))
    ) {
      pill.classList.add('active');
    }
  });

  renderMenuGrid();
}

function renderMenuGrid() {
  const container = document.getElementById('customer-menu-grid');
  if (!container) return;

  let items = clientState.menu;

  // Filtro por categoria
  if (clientState.category !== 'all') {
    items = items.filter(item => item.category === clientState.category);
  }

  // Filtro por busca
  if (clientState.searchQuery.trim() !== '') {
    const q = clientState.searchQuery.toLowerCase();
    items = items.filter(item => 
      item.name.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; color: var(--text-tertiary); padding: 40px 0;">
        Nenhum item encontrado no cardápio.
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => {
    const inCart = clientState.cart.find(c => c.menuItemId === item.id);
    const qty = inCart ? inCart.quantity : 0;

    const actionHtml = qty > 0 
      ? `
        <div class="food-action-box">
          <button class="counter-btn" onclick="updateCustomerCartQty('${item.id}', -1)">−</button>
          <span class="counter-qty">${qty}</span>
          <button class="counter-btn" onclick="updateCustomerCartQty('${item.id}', 1)">+</button>
        </div>
      `
      : `
        <button class="counter-btn add-main" onclick="updateCustomerCartQty('${item.id}', 1)">+</button>
      `;

    const imgTag = item.image 
      ? `<img src="${item.image}" alt="${item.name}" class="food-img" loading="lazy">`
      : `<div class="food-img" style="display:flex; align-items:center; justify-content:center; color:var(--text-tertiary); font-size:1.5rem;">🍽️</div>`;

    return `
      <div class="food-card">
        <div class="food-card-top">
          ${imgTag}
          <div class="food-info">
            <h4 class="food-name">${item.name}</h4>
            <p class="food-desc">${item.description || ''}</p>
          </div>
        </div>
        <div class="food-card-bottom">
          <span class="food-price">${formatCurrency(item.price)}</span>
          ${actionHtml}
        </div>
      </div>
    `;
  }).join('');
}

function updateCustomerCartQty(menuItemId, change) {
  const itemIndex = clientState.cart.findIndex(i => i.menuItemId === menuItemId);

  if (itemIndex > -1) {
    clientState.cart[itemIndex].quantity += change;
    if (clientState.cart[itemIndex].quantity <= 0) {
      clientState.cart.splice(itemIndex, 1);
    }
  } else if (change > 0) {
    clientState.cart.push({ menuItemId, quantity: 1 });
  }

  renderMenuGrid();
  updateFloatingCartBar();
}

function getCartItemCount() {
  return clientState.cart.reduce((sum, item) => sum + item.quantity, 0);
}

function getCartTotal() {
  return clientState.cart.reduce((sum, item) => {
    const menuItem = clientState.menu.find(m => m.id === item.menuItemId);
    return sum + (menuItem ? menuItem.price * item.quantity : 0);
  }, 0);
}

function updateFloatingCartBar() {
  const floatingBar = document.getElementById('floating-cart-bar');
  const countEl = document.getElementById('floating-cart-count');
  const totalEl = document.getElementById('floating-cart-total');

  const count = getCartItemCount();
  const total = getCartTotal();

  if (count > 0 && clientState.currentScreen === 'menu') {
    countEl.textContent = `${count} ${count === 1 ? 'item selecionado' : 'itens selecionados'}`;
    totalEl.textContent = formatCurrency(total);
    floatingBar.classList.add('visible');
  } else {
    floatingBar.classList.remove('visible');
  }
}

// --- SCREEN 3: CART REVIEW ---
function renderCartReview() {
  const container = document.getElementById('cart-items-container');
  if (!container) return;

  const total = getCartTotal();

  container.innerHTML = clientState.cart.map(item => {
    const menuItem = clientState.menu.find(m => m.id === item.menuItemId);
    if (!menuItem) return '';
    const itemTotal = menuItem.price * item.quantity;

    return `
      <div class="cart-item-card">
        <div class="cart-item-left">
          <span class="cart-item-title">${menuItem.name}</span>
          <span class="cart-item-price-unit">${formatCurrency(menuItem.price)} un.</span>
        </div>
        <div class="cart-item-right">
          <div class="food-action-box">
            <button class="counter-btn" onclick="updateCartReviewQty('${menuItem.id}', -1)">−</button>
            <span class="counter-qty">${item.quantity}</span>
            <button class="counter-btn" onclick="updateCartReviewQty('${menuItem.id}', 1)">+</button>
          </div>
          <span class="cart-item-subtotal">${formatCurrency(itemTotal)}</span>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('cart-subtotal-val').textContent = formatCurrency(total);
  document.getElementById('cart-total-val').textContent = formatCurrency(total);
}

function updateCartReviewQty(menuItemId, change) {
  updateCustomerCartQty(menuItemId, change);
  if (clientState.cart.length === 0) {
    alert('Todos os itens foram removidos do carrinho.');
    goToScreen('menu');
  } else {
    renderCartReview();
  }
}

// --- SCREEN 4: PAYMENT SELECTION & DETAILS ---
function selectPaymentMethod(method) {
  clientState.paymentMethod = method;

  ['pix', 'card', 'cash', 'fiado'].forEach(m => {
    const btn = document.getElementById(`pay-method-${m}`);
    if (btn) btn.classList.toggle('active', m === method);
  });

  renderPaymentDetails();
}

function renderPaymentDetails() {
  const container = document.getElementById('payment-details-container');
  const total = getCartTotal();
  document.getElementById('pay-total-display').textContent = formatCurrency(total);

  if (!container) return;

  if (clientState.paymentMethod === 'pix') {
    const pixPayload = `00020126580014br.gov.bcb.pix0136bistro-gestao-pagamentos@bistro.com520400005303986540${total.toFixed(2)}5802BR5916BISTRO COMANDAS6009SAO PAULO62070503***6304`;

    container.innerHTML = `
      <div class="pay-details-box">
        <div class="pix-qr-container">
          <div style="font-weight: 700; color: var(--text-primary);">Escaneie o QR Code abaixo com seu App do Banco:</div>
          <div class="pix-qr-canvas-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 200 200">
              <rect width="200" height="200" fill="#ffffff"/>
              <rect x="20" y="20" width="50" height="50" fill="#000000"/>
              <rect x="30" y="30" width="30" height="30" fill="#ffffff"/>
              <rect x="38" y="38" width="14" height="14" fill="#000000"/>
              
              <rect x="130" y="20" width="50" height="50" fill="#000000"/>
              <rect x="140" y="30" width="30" height="30" fill="#ffffff"/>
              <rect x="148" y="38" width="14" height="14" fill="#000000"/>
              
              <rect x="20" y="130" width="50" height="50" fill="#000000"/>
              <rect x="30" y="140" width="30" height="30" fill="#ffffff"/>
              <rect x="38" y="148" width="14" height="14" fill="#000000"/>
              
              <rect x="85" y="25" width="25" height="15" fill="#000000"/>
              <rect x="85" y="55" width="30" height="15" fill="#000000"/>
              <rect x="85" y="85" width="30" height="30" fill="#000000"/>
              <rect x="130" y="85" width="45" height="15" fill="#000000"/>
              <rect x="25" y="85" width="45" height="20" fill="#000000"/>
              <rect x="130" y="120" width="20" height="40" fill="#000000"/>
              <rect x="160" y="145" width="20" height="25" fill="#000000"/>
              <rect x="85" y="130" width="30" height="40" fill="#000000"/>
            </svg>
          </div>
          
          <div style="font-size: 0.85rem; color: var(--text-secondary);">Ou copie o código Copia e Cola:</div>
          <div class="pix-code-row">
            <input type="text" class="search-box-input" readonly value="${pixPayload}" id="pix-copy-input" style="font-size: 0.8rem;">
            <button type="button" class="btn-primary-large" style="width: auto; padding: 10px 16px; font-size: 0.85rem; margin: 0;" onclick="copyPixCode()">
              Copiar
            </button>
          </div>
        </div>
      </div>
    `;
  } else if (clientState.paymentMethod === 'card') {
    container.innerHTML = `
      <div class="pay-details-box" style="text-align: center; padding: 24px;">
        <div style="width: 50px; height: 50px; margin: 0 auto 12px; background: var(--accent-light); color: var(--accent); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
        </div>
        <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 6px;">Pagamento com Cartão no Balcão</h4>
        <p style="color: var(--text-secondary); font-size: 0.9rem; max-width: 400px; margin: 0 auto;">
          Aceitamos cartões de Crédito, Débito e Aproximação (NFC). O pagamento será feito diretamente no balcão ao retirar seu pedido.
        </p>
      </div>
    `;
  } else if (clientState.paymentMethod === 'cash') {
    container.innerHTML = `
      <div class="pay-details-box">
        <label class="form-label" style="font-weight: 700; font-size: 0.9rem; margin-bottom: 6px; display: block;" for="cash-change">Vai precisar de troco? Para quanto?</label>
        <input class="search-box-input" type="number" step="0.01" id="cash-change" placeholder="Ex: 50.00 (Deixe em branco se tiver o valor exato)" oninput="clientState.cashChangeFor = this.value">
        <p style="color: var(--text-tertiary); font-size: 0.8rem; margin-top: 6px;">O pagamento em dinheiro será efetuado no balcão ao retirar a senha.</p>
      </div>
    `;
  } else if (clientState.paymentMethod === 'fiado') {
    const isLogged = clientState.loggedInClient !== null;
    const clientName = isLogged ? clientState.loggedInClient.name : clientState.customerName;
    const cartTotal = getCartTotal();

    let limitInfoHtml = '';
    const debtInfo = getClientDebtAndLimit(clientName);
    if (debtInfo) {
      const isOverLimit = debtInfo.totalDebt + cartTotal > debtInfo.creditLimit || debtInfo.availableLimit < cartTotal;
      limitInfoHtml = `
        <div style="background: ${isOverLimit ? 'rgba(239, 68, 68, 0.08)' : 'var(--color-free-light)'}; border: 1px solid ${isOverLimit ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}; border-radius: 8px; padding: 12px; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
            <span>Limite Disponível:</span>
            <strong style="color: ${debtInfo.availableLimit >= cartTotal ? 'var(--color-free)' : '#ef4444'};">${formatCurrency(Math.max(0, debtInfo.availableLimit))}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary);">
            <span>Limite Total / Débito:</span>
            <span>${formatCurrency(debtInfo.creditLimit)} / ${formatCurrency(debtInfo.totalDebt)}</span>
          </div>
          ${isOverLimit ? `
            <div style="color: #ef4444; font-size: 0.82rem; font-weight: 700; margin-top: 6px; display: flex; align-items: center; gap: 4px;">
              ⚠️ Limite insuficiente para este pedido (${formatCurrency(cartTotal)}).
            </div>
          ` : ''}
        </div>
      `;
    }

    container.innerHTML = `
      <div class="pay-details-box">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-paying)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <h4 style="font-weight: 700; font-size: 1.05rem; color: var(--text-primary);">Autorização de Caderneta / Fiado</h4>
        </div>

        ${limitInfoHtml}

        <div style="margin-bottom: 14px;">
          <label class="form-label" style="font-weight: 700; font-size: 0.88rem; margin-bottom: 6px; display: block;" for="fiado-username">Titular da Conta *</label>
          <input class="search-box-input" type="text" id="fiado-username" placeholder="Digite seu nome cadastrado" value="${clientName || ''}">
        </div>

        <div style="margin-bottom: 14px;">
          <label class="form-label" style="font-weight: 700; font-size: 0.88rem; margin-bottom: 6px; display: block;" for="fiado-password">Senha de Autorização *</label>
          <input class="search-box-input" type="password" id="fiado-password" placeholder="Digite sua senha">
        </div>
      </div>
    `;
  }
}

function copyPixCode() {
  const input = document.getElementById('pix-copy-input');
  if (input) {
    input.select();
    navigator.clipboard.writeText(input.value);
    alert('Código PIX Copiado com Sucesso!');
  }
}

// --- SCREEN 5: FINALIZE ORDER & TICKET ---
function handleFinalizeOrder() {
  if (clientState.cart.length === 0) {
    alert('Seu carrinho está vazio!');
    goToScreen('menu');
    return;
  }

  // Se o método for fiado, simular autenticação de usuário e senha
  if (clientState.paymentMethod === 'fiado') {
    const userInput = document.getElementById('fiado-username');
    const passInput = document.getElementById('fiado-password');

    const fiadoUser = userInput ? userInput.value.trim() || clientState.customerName : clientState.customerName;
    const fiadoPass = passInput ? passInput.value.trim() : '';

    if (!fiadoUser || !fiadoPass) {
      alert('Por favor, informe o titular e a senha da conta fiado.');
      return;
    }

    simulateFiadoAuthAndExecute(fiadoUser);
    return;
  }

  // Finalização direta para outros métodos
  executeFinalizeOrder();
}

function simulateFiadoAuthAndExecute(fiadoUser) {
  loadClientsFromStorage();
  const cartTotal = getCartTotal();
  const debtInfo = getClientDebtAndLimit(fiadoUser);

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'fiado-auth-overlay';
  modalOverlay.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(6px);
    z-index: 9999; display: flex; align-items: center; justify-content: center;
    padding: 20px; animation: fadeIn 0.25s ease;
  `;

  modalOverlay.innerHTML = `
    <div style="background: var(--bg-secondary); border: 2px solid var(--color-paying); border-radius: var(--radius-lg); padding: 32px 24px; max-width: 440px; width: 100%; text-align: center; box-shadow: var(--shadow-lg);">
      <div id="auth-spinner-icon" style="width: 60px; height: 60px; margin: 0 auto 16px; border-radius: 50%; background: var(--color-paying-light); color: var(--color-paying); display: flex; align-items: center; justify-content: center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      </div>
      <h3 id="auth-title" style="font-family: var(--font-title); font-size: 1.25rem; font-weight: 800; margin-bottom: 6px;">Autenticando Fiado...</h3>
      <p id="auth-desc" style="font-size: 0.9rem; color: var(--text-secondary);">Verificando credenciais e limite do titular <strong>"${fiadoUser}"</strong>...</p>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  // Validação assíncrona com retorno visual detalhado
  setTimeout(() => {
    const iconBox = document.getElementById('auth-spinner-icon');
    const title = document.getElementById('auth-title');
    const desc = document.getElementById('auth-desc');

    // 1. Cliente não encontrado
    if (!debtInfo || !debtInfo.client) {
      if (iconBox && title && desc) {
        iconBox.style.background = 'rgba(239, 68, 68, 0.15)';
        iconBox.style.color = '#ef4444';
        iconBox.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
        `;
        title.textContent = 'Cliente Não Encontrado';
        title.style.color = '#ef4444';
        desc.innerHTML = `
          O titular <strong>"${fiadoUser}"</strong> não está cadastrado como cliente no Bistrô.<br><br>
          <button class="btn-primary-large" style="width: 100%; margin-top: 10px; background: var(--accent);" onclick="document.getElementById('fiado-auth-overlay').remove()">Escolher Outra Forma de Pagamento</button>
        `;
      }
      return;
    }

    const { client, totalDebt, creditLimit, availableLimit } = debtInfo;

    // 2. Limite excedido ou esgotado
    if (totalDebt + cartTotal > creditLimit || availableLimit < cartTotal) {
      if (iconBox && title && desc) {
        iconBox.style.background = 'rgba(239, 68, 68, 0.15)';
        iconBox.style.color = '#ef4444';
        iconBox.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
        `;
        title.textContent = 'Limite de Crédito Excedido';
        title.style.color = '#ef4444';
        desc.innerHTML = `
          O cliente <strong>"${client.name}"</strong> não possui limite suficiente para autorizar este pedido.<br><br>
          <div style="background: var(--bg-primary); border: 1px solid var(--border); border-radius: 8px; padding: 12px; font-size: 0.85rem; text-align: left; line-height: 1.6; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between;"><span>💳 Limite Total:</span> <strong>${formatCurrency(creditLimit)}</strong></div>
            <div style="display: flex; justify-content: space-between;"><span>📋 Débito Atual:</span> <strong style="color: #ef4444;">${formatCurrency(totalDebt)}</strong></div>
            <div style="display: flex; justify-content: space-between;"><span>⚡ Disponível:</span> <strong style="color: ${availableLimit > 0 ? 'var(--color-free)' : '#ef4444'};">${formatCurrency(Math.max(0, availableLimit))}</strong></div>
            <div style="border-top: 1px dashed var(--border); margin: 6px 0; padding-top: 6px; display: flex; justify-content: space-between;"><span>🛒 Total deste Pedido:</span> <strong>${formatCurrency(cartTotal)}</strong></div>
          </div>
          <span style="font-size: 0.82rem; color: var(--text-secondary); display: block; margin-bottom: 14px;">Quite o saldo pendente no caixa ou pague seu pedido com PIX, Cartão ou Dinheiro.</span>
          <button class="btn-primary-large" style="width: 100%; background: var(--accent);" onclick="document.getElementById('fiado-auth-overlay').remove()">Trocar Forma de Pagamento</button>
        `;
      }
      return;
    }

    // 3. Aprovado com sucesso!
    if (iconBox && title && desc) {
      iconBox.style.background = 'var(--color-free-light)';
      iconBox.style.color = 'var(--color-free)';
      iconBox.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      `;
      title.textContent = 'Autorizado com Sucesso!';
      title.style.color = 'var(--color-free)';
      desc.innerHTML = `Crédito aprovado para <strong>"${client.name}"</strong>.<br>Finalizando seu pedido...`;
    }

    setTimeout(() => {
      modalOverlay.remove();
      executeFinalizeOrder(client.name);
    }, 700);
  }, 900);
}

function executeFinalizeOrder(customFiadoUser) {
  // Obter observações
  const notesInput = document.getElementById('order-notes');
  clientState.notes = notesInput ? notesInput.value.trim() : '';

  // Gerar número de senha diária sequencial
  let seq = parseInt(localStorage.getItem('bistro_ticket_seq') || '0', 10) + 1;
  localStorage.setItem('bistro_ticket_seq', seq.toString());

  const ticketFormatted = `#${String(seq).padStart(3, '0')}`;
  const total = getCartTotal();
  const now = new Date();

  const customerDisplayName = customFiadoUser || clientState.customerName || 'Cliente';

  // Objeto do pedido
  const newOrder = {
    id: `order-${Date.now()}`,
    ticketNumber: ticketFormatted,
    customerName: customerDisplayName,
    customerPhone: clientState.customerPhone,
    orderType: clientState.orderType, // 'balcao' | 'local'
    location: 'Balcão / Autoatendimento',
    destination: clientState.orderType === 'balcao' ? 'Retirar no Balcão' : 'Comer no Local',
    paymentMethod: clientState.paymentMethod,
    items: JSON.parse(JSON.stringify(clientState.cart)),
    notes: clientState.notes,
    total: total,
    createdAt: now.toISOString(),
    status: 'preparing' // 'preparing' | 'ready' | 'delivered'
  };

  clientState.lastOrder = newOrder;

  // 1. Salvar no histórico de pedidos do Bistrô
  let ordersList = [];
  try {
    const saved = localStorage.getItem('bistro_orders');
    if (saved) ordersList = JSON.parse(saved);
  } catch (e) {
    ordersList = [];
  }
  ordersList.unshift(newOrder);
  localStorage.setItem('bistro_orders', JSON.stringify(ordersList));

  // 2. Se não for fiado, adicionar à receita do dia
  if (clientState.paymentMethod !== 'fiado') {
    let currentRevenue = parseFloat(localStorage.getItem('bistro_revenue') || '0');
    currentRevenue += total;
    localStorage.setItem('bistro_revenue', currentRevenue.toString());
  } else {
    // Se for fiado, registrar dívida com o nome informado
    let fiadosList = [];
    try {
      const savedFiados = localStorage.getItem('bistro_fiados');
      if (savedFiados) fiadosList = JSON.parse(savedFiados);
    } catch (e) {
      fiadosList = [];
    }

    fiadosList.push({
      id: `fiado-${Date.now()}`,
      clientName: customerDisplayName,
      tableInfo: `Autoatendimento (${ticketFormatted})`,
      items: JSON.parse(JSON.stringify(clientState.cart)),
      total: total,
      date: now.toISOString()
    });
    localStorage.setItem('bistro_fiados', JSON.stringify(fiadosList));
  }

  // Notificar outros ouvintes e atualizar header
  window.dispatchEvent(new Event('storage'));
  updateLoggedUserHeader();

  // Ir para tela de sucesso
  goToScreen('success');
}

function getActiveCustomerOrder() {
  if (clientState.lastOrder) {
    // Sincronizar com o banco de pedidos mais recente
    let ordersList = [];
    try {
      const saved = localStorage.getItem('bistro_orders');
      if (saved) ordersList = JSON.parse(saved);
      const updated = ordersList.find(o => o.id === clientState.lastOrder.id || o.ticketNumber === clientState.lastOrder.ticketNumber);
      if (updated) {
        clientState.lastOrder = updated;
        return updated;
      }
    } catch(e) {}
    return clientState.lastOrder;
  }

  // Se não tiver lastOrder no estado, pegar o mais recente do cliente logado ou geral
  let ordersList = [];
  try {
    const saved = localStorage.getItem('bistro_orders');
    if (saved) ordersList = JSON.parse(saved);
  } catch(e) {
    ordersList = [];
  }

  if (clientState.loggedInClient) {
    const clientOrder = ordersList.find(o => o.customerName && o.customerName.toLowerCase() === clientState.loggedInClient.name.toLowerCase());
    if (clientOrder) return clientOrder;
  }

  return ordersList.length > 0 ? ordersList[0] : null;
}

function updateTrackHeaderBadge() {
  const badgeBtn = document.getElementById('btn-track-header');
  const textSpan = document.getElementById('track-header-text');
  if (!badgeBtn || !textSpan) return;

  const activeOrder = getActiveCustomerOrder();
  if (!activeOrder || activeOrder.status === 'delivered') {
    badgeBtn.style.display = 'none';
    return;
  }

  badgeBtn.style.display = 'inline-flex';
  
  if (activeOrder.status === 'ready') {
    badgeBtn.classList.add('ready-pulse');
    textSpan.textContent = `🔔 Pronto (${activeOrder.ticketNumber})`;
  } else {
    badgeBtn.classList.remove('ready-pulse');
    textSpan.textContent = `🕒 Preparando (${activeOrder.ticketNumber})`;
  }
}

function renderSuccessTicket() {
  const order = getActiveCustomerOrder();
  if (!order) return;

  const numDisplay = document.getElementById('ticket-number-display');
  const clientDisplay = document.getElementById('ticket-client-display');
  const metaDisplay = document.getElementById('ticket-meta-display');
  const totalDisplay = document.getElementById('ticket-total-display');
  const itemsDisplay = document.getElementById('ticket-items-display');
  const liveTracker = document.getElementById('ticket-live-tracker');

  if (numDisplay) numDisplay.textContent = order.ticketNumber || '#001';
  if (clientDisplay) clientDisplay.textContent = order.customerName || 'Cliente';
  
  const dateFormatted = new Date(order.createdAt || Date.now()).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  if (metaDisplay) metaDisplay.textContent = `${order.destination || 'Balcão'} • ${dateFormatted}`;

  if (itemsDisplay) {
    itemsDisplay.innerHTML = (order.items || []).map(item => {
      const menuItem = clientState.menu.find(m => m.id === item.menuItemId);
      const name = menuItem ? menuItem.name : 'Item';
      const itemTotal = menuItem ? menuItem.price * item.quantity : 0;
      return `
        <div class="ticket-item-row">
          <span><strong>${item.quantity}x</strong> ${name}</span>
          <span style="font-weight: 700;">${formatCurrency(itemTotal)}</span>
        </div>
      `;
    }).join('');
  }

  if (totalDisplay) totalDisplay.textContent = formatCurrency(order.total || 0);

  // Atualizar mini tracker na tela do ticket
  if (liveTracker) {
    const headline = document.getElementById('ticket-status-headline');
    const fill = document.getElementById('ticket-progress-fill');
    
    if (order.status === 'ready') {
      liveTracker.className = 'ticket-live-status-box ready';
      if (headline) headline.innerHTML = `🔔 <strong>SEU PEDIDO ESTÁ PRONTO!</strong> Retire no balcão`;
      if (fill) fill.style.width = '100%';
    } else if (order.status === 'delivered') {
      liveTracker.className = 'ticket-live-status-box completed';
      if (headline) headline.innerHTML = `✅ <strong>Pedido Entregue</strong> - Bom apetite!`;
      if (fill) fill.style.width = '100%';
    } else {
      liveTracker.className = 'ticket-live-status-box';
      if (headline) headline.innerHTML = `<span class="live-dot"></span> <strong>Na Cozinha (Em Preparo)</strong>`;
      if (fill) fill.style.width = '55%';
    }
  }
}

function renderTrackScreen() {
  const container = document.getElementById('track-order-content');
  if (!container) return;

  const order = getActiveCustomerOrder();

  if (!order) {
    container.innerHTML = `
      <div style="text-align: center; padding: 48px 20px; color: var(--text-tertiary);">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 12px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--text-primary); margin-bottom: 4px;">Nenhum pedido em andamento</h3>
        <p style="font-size: 0.9rem; margin-bottom: 18px;">Você ainda não fez nenhum pedido nesta sessão.</p>
        <button class="btn-primary-large" style="width: auto; padding: 12px 24px; margin: 0 auto;" onclick="goToScreen('menu')">
          Ver Cardápio & Fazer Pedido
        </button>
      </div>
    `;
    return;
  }

  const isPreparing = order.status === 'preparing';
  const isReady = order.status === 'ready';
  const isDelivered = order.status === 'delivered';

  const dateFormatted = new Date(order.createdAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit'
  });

  const paymentLabels = {
    pix: '📱 PIX Instantâneo',
    card: '💳 Cartão no Balcão',
    cash: '💵 Dinheiro no Balcão',
    fiado: '📋 Caderneta / Fiado'
  };

  let alertBannerHtml = '';
  if (isReady) {
    alertBannerHtml = `
      <div class="ready-announcement-banner">
        <div class="ready-bell-icon">🔔</div>
        <div>
          <h3 class="ready-title">SEU PEDIDO ESTÁ PRONTO!</h3>
          <p class="ready-subtitle">Dirija-se ao balcão de entrega e apresente sua senha <strong>${order.ticketNumber}</strong>.</p>
        </div>
      </div>
    `;
  }

  const itemsRows = (order.items || []).map(item => {
    const menuItem = clientState.menu.find(m => m.id === item.menuItemId);
    const name = menuItem ? menuItem.name : 'Item';
    const itemTotal = menuItem ? menuItem.price * item.quantity : 0;
    return `
      <div class="track-item-row">
        <span><strong>${item.quantity}x</strong> ${name}</span>
        <span style="font-weight: 700;">${formatCurrency(itemTotal)}</span>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <!-- Top Ticket Hero -->
    <div class="track-ticket-hero ${isReady ? 'ready' : ''}">
      <div class="track-ticket-label">SENHA DE ATENDIMENTO</div>
      <div class="track-ticket-number">${order.ticketNumber}</div>
      <div class="track-ticket-name">👤 ${order.customerName}</div>
      <div class="track-ticket-meta">🕒 Enviado às ${dateFormatted} • ${order.destination || 'Balcão'}</div>
    </div>

    ${alertBannerHtml}

    <!-- Live Stepper Tracker -->
    <div class="track-stepper-box">
      <div class="track-step-node completed">
        <div class="step-circle">✓</div>
        <div class="step-text">
          <div class="step-title">Pedido Recebido</div>
          <div class="step-desc">Confirmado pelo sistema</div>
        </div>
      </div>

      <div class="track-step-connector ${isPreparing || isReady || isDelivered ? 'active' : ''}"></div>

      <div class="track-step-node ${isPreparing ? 'current active-glow' : (isReady || isDelivered ? 'completed' : '')}">
        <div class="step-circle">${isReady || isDelivered ? '✓' : '👨‍🍳'}</div>
        <div class="step-text">
          <div class="step-title">Na Cozinha</div>
          <div class="step-desc">${isPreparing ? 'Os chefs estão preparando...' : 'Preparo concluído'}</div>
        </div>
      </div>

      <div class="track-step-connector ${isReady || isDelivered ? 'active' : ''}"></div>

      <div class="track-step-node ${isReady ? 'current ready-glow' : (isDelivered ? 'completed' : '')}">
        <div class="step-circle">${isDelivered ? '✓' : '🔔'}</div>
        <div class="step-text">
          <div class="step-title">Pronto para Retirada</div>
          <div class="step-desc">${isReady ? 'Disponível no balcão!' : (isDelivered ? 'Retirado' : 'Aguardando preparo')}</div>
        </div>
      </div>

      <div class="track-step-connector ${isDelivered ? 'active' : ''}"></div>

      <div class="track-step-node ${isDelivered ? 'current completed' : ''}">
        <div class="step-circle">${isDelivered ? '🎉' : '🏁'}</div>
        <div class="step-text">
          <div class="step-title">Entregue</div>
          <div class="step-desc">${isDelivered ? 'Bom apetite!' : 'Finalização'}</div>
        </div>
      </div>
    </div>

    <!-- Items Summary Box -->
    <div class="track-items-box">
      <div class="track-items-title">Itens Deste Pedido</div>
      ${itemsRows}
      <div class="track-total-row">
        <span>Total:</span>
        <span style="color: var(--color-paying); font-weight: 800; font-size: 1.25rem;">${formatCurrency(order.total)}</span>
      </div>
      <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 6px;">
        Pagamento: <strong>${paymentLabels[order.paymentMethod] || order.paymentMethod}</strong>
      </div>
    </div>

    <!-- Bottom Actions -->
    <div style="display: flex; gap: 12px; margin-top: 20px; flex-wrap: wrap;">
      <button type="button" class="btn-secondary" style="flex: 1; padding: 12px; justify-content: center;" onclick="window.print()">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
        Imprimir Comprovante
      </button>
      <button type="button" class="btn-primary-large" style="flex: 1.4; margin-top: 0;" onclick="startNewOrder()">
        🛍️ Fazer Novo Pedido
      </button>
    </div>
  `;
}

function startNewOrder() {
  clientState.cart = [];
  clientState.notes = '';
  clientState.cashChangeFor = '';
  clientState.searchQuery = '';
  clientState.category = 'all';
  updateFloatingCartBar();
  renderMenuGrid();
  goToScreen('menu');
}

function resetOrderFlow() {
  startNewOrder();
}

function printCustomerTicket() {
  window.print();
}

// --- UTILITIES & THEME ---
function formatCurrency(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

function toggleCustomerTheme() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('bistro_theme', isDark ? 'dark' : 'light');
}

// Exposição global das funções de controle
window.startNewOrder = startNewOrder;
window.resetOrderFlow = resetOrderFlow;
window.printCustomerTicket = printCustomerTicket;
window.goToScreen = goToScreen;
window.renderTrackScreen = renderTrackScreen;
