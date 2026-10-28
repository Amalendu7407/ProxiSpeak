import { apiRequest, setAccessToken } from './api.js';

let refreshPromise = null;
let lastRefreshResult = null;
let lastRefreshTime = 0;

export const authService = {
  async register({ name, email, password, confirmPassword }) {
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, confirmPassword }),
    });
    setAccessToken(data.accessToken);
    lastRefreshResult = data;
    lastRefreshTime = Date.now();
    return data;
  },

  async login({ email, password }) {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAccessToken(data.accessToken);
    lastRefreshResult = data;
    lastRefreshTime = Date.now();
    return data;
  },

  async refresh() {
    // If a refresh just completed within the last 10 seconds and was successful,
    // reuse the result to prevent race conditions (e.g. React StrictMode double mounting)
    if (lastRefreshResult && (Date.now() - lastRefreshTime < 10000)) {
      return lastRefreshResult;
    }

    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      try {
        const data = await apiRequest('/api/auth/refresh', {
          method: 'POST',
        });
        if (data.accessToken) {
          setAccessToken(data.accessToken);
          lastRefreshResult = data;
          lastRefreshTime = Date.now();
        } else {
          lastRefreshResult = null;
          lastRefreshTime = 0;
        }
        return data;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  },

  async logout() {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } finally {
      lastRefreshResult = null;
      lastRefreshTime = 0;
      setAccessToken(null);
    }
  },

  async getMe() {
    return apiRequest('/api/auth/me');
  },
};
