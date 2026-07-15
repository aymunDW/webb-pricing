const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function getToken() { return localStorage.getItem('wp_token'); }

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),

  getGoldPrice: () => request('/gold-price'),

  getStyles: () => request('/styles'),
  createStyle: (body) => request('/styles', { method: 'POST', body }),
  updateStyle: (id, body) => request(`/styles/${id}`, { method: 'PUT', body }),
  deleteStyle: (id) => request(`/styles/${id}`, { method: 'DELETE' }),
  getStyleDetail: (id) => request(`/styles/${id}/detail`),

  addPriceHistory: (body) => request('/price-history', { method: 'POST', body }),
  deletePriceHistory: (id) => request(`/price-history/${id}`, { method: 'DELETE' }),

  addSale: (body) => request('/sales', { method: 'POST', body }),
  deleteSale: (id) => request(`/sales/${id}`, { method: 'DELETE' }),

  addCompetitor: (body) => request('/competitors', { method: 'POST', body }),
  deleteCompetitor: (id) => request(`/competitors/${id}`, { method: 'DELETE' }),
};

export function setToken(token) {
  if (token) localStorage.setItem('wp_token', token);
  else localStorage.removeItem('wp_token');
}
export function getStoredToken() { return getToken(); }
