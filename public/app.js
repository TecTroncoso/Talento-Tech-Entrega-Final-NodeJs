const API_URL = window.location.origin;

// DOM Elements
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

const runTestsBtn = document.getElementById('runTestsBtn');
const testsOutput = document.getElementById('testsOutput');

const createProductForm = document.getElementById('createProductForm');
const createError = document.getElementById('createError');
const productsBody = document.getElementById('productsBody');
const refreshBtn = document.getElementById('refreshBtn');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// State
let token = localStorage.getItem('token');
let editProductId = null;

// Initialize
function init() {
  if (token) {
    showDashboard();
    loadProducts();
  } else {
    showLogin();
  }
}

// UI Functions
function showLogin() {
  loginSection.classList.remove('hidden');
  dashboardSection.classList.add('hidden');
  logoutBtn.classList.add('hidden');
}

function showDashboard() {
  loginSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  logoutBtn.classList.remove('hidden');
}

function showError(el, message) {
  el.textContent = message;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

// Authentication
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');

    token = data.token;
    localStorage.setItem('token', token);
    showDashboard();
    loadProducts();
  } catch (err) {
    showError(loginError, err.message);
  }
});

logoutBtn.addEventListener('click', () => {
  token = null;
  localStorage.removeItem('token');
  showLogin();
});

// Run Tests
runTestsBtn.addEventListener('click', async () => {
  testsOutput.classList.remove('hidden');
  testsOutput.textContent = 'Ejecutando tests... Por favor espera.';
  runTestsBtn.disabled = true;

  try {
    const res = await fetch(`${API_URL}/api/tests/run`);
    const data = await res.json();
    
    let out = data.stdout || '';
    if (data.stderr) out += '\n' + data.stderr;
    if (data.error) out += '\nError: ' + data.error;
    
    testsOutput.textContent = out || 'Sin salida';
    // Recargar productos después de los tests
    loadProducts();
  } catch (err) {
    testsOutput.textContent = 'Error al ejecutar tests: ' + err.message;
  } finally {
    runTestsBtn.disabled = false;
  }
});

// Load Products
async function loadProducts() {
  try {
    const res = await fetch(`${API_URL}/api/products`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.status === 401 || res.status === 403) {
      logoutBtn.click();
      return;
    }

    const products = await res.json();
    renderProducts(products);
  } catch (err) {
    console.error('Error cargando productos:', err);
  }
}

refreshBtn.addEventListener('click', loadProducts);

function renderProducts(products) {
  productsBody.innerHTML = '';
  if (!Array.isArray(products) || products.length === 0) {
    productsBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted)">No hay productos</td></tr>';
    return;
  }

  products.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>$${p.price}</td>
      <td>${p.stock !== undefined ? p.stock : '-'}</td>
      <td>${p.category || '-'}</td>
      <td>
        <button class="btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-right: 0.5rem;" onclick='editProduct(${JSON.stringify(p).replace(/'/g, "&apos;")})'>Modificar</button>
        <button class="btn-danger" onclick="deleteProduct('${p.id}')">Eliminar</button>
      </td>
    `;
    productsBody.appendChild(tr);
  });
}

// Create Product
createProductForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('prodName').value;
  const price = parseFloat(document.getElementById('prodPrice').value);
  const stock = document.getElementById('prodStock').value ? parseInt(document.getElementById('prodStock').value) : undefined;
  const category = document.getElementById('prodCategory').value || undefined;
  const description = document.getElementById('prodDesc').value || undefined;

  const payload = { name, price, stock, category, description };
  // Limpiar undefined
  Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

  try {
    const url = editProductId ? `${API_URL}/api/products/${editProductId}` : `${API_URL}/api/products/create`;
    const method = editProductId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok) {
      const msg = data.details ? data.details.map(d => d.message).join(', ') : (data.error || 'Error al guardar');
      throw new Error(msg);
    }

    cancelEdit();
    loadProducts();
  } catch (err) {
    showError(createError, err.message);
  }
});

// Edit Product
window.editProduct = (p) => {
  editProductId = p.id;
  document.getElementById('prodName').value = p.name;
  document.getElementById('prodPrice').value = p.price;
  document.getElementById('prodStock').value = p.stock !== undefined ? p.stock : '';
  document.getElementById('prodCategory').value = p.category || '';
  document.getElementById('prodDesc').value = p.description || '';

  formTitle.textContent = 'Modificar Producto';
  submitBtn.textContent = 'Guardar Cambios';
  cancelEditBtn.classList.remove('hidden');
  document.getElementById('prodName').focus();
};

window.cancelEdit = () => {
  editProductId = null;
  createProductForm.reset();
  formTitle.textContent = 'Crear Producto';
  submitBtn.textContent = 'Crear Producto';
  cancelEditBtn.classList.add('hidden');
};

// Delete Product
window.deleteProduct = async (id) => {
  if (!confirm('¿Seguro que deseas eliminar este producto?')) return;
  
  try {
    const res = await fetch(`${API_URL}/api/products/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error('Error al eliminar');
    loadProducts();
  } catch (err) {
    alert(err.message);
  }
};

init();
