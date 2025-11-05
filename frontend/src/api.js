export const API = {
  async request(path, { method = 'GET', token, headers = {}, body } = {}) {
    const res = await fetch(path, {
      method,
      headers: {
        ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) return res.json();
    return res.text();
  },

  login: (email, password) => API.request('/api/auth/login', { method: 'POST', body: { email, password } }),
  register: (email, password) => API.request('/api/auth/register', { method: 'POST', body: { email, password } }),
  me: (token) => API.request('/api/me', { token }),
  getUpdates: (token) => API.request('/api/updates', { token }),
  createUpdate: (token, { product_code, product_name, status, notes, image }) => {
    const fd = new FormData();
    fd.append('product_code', product_code);
    if (product_name) fd.append('product_name', product_name);
    fd.append('status', status);
    if (notes) fd.append('notes', notes);
    if (image) fd.append('image', image);
    return API.request('/api/updates', { method: 'POST', token, body: fd });
  },
};
