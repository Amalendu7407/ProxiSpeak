let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

let isRefreshing = false;
let refreshQueue = [];

function processQueue(error, token = null) {
  refreshQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  refreshQueue = [];
}

export async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : endpoint;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // If payload is FormData, let browser set multipart boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  if (accessToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const config = {
    ...options,
    headers,
    credentials: 'include', // Include HttpOnly refreshToken cookie
  };

  let response = await fetch(url, config);

  // If access token expired and not already calling refresh or login
  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then((newToken) => {
        config.headers.Authorization = `Bearer ${newToken}`;
        return fetch(url, config).then(handleResponse);
      });
    }

    isRefreshing = true;

    try {
      const refreshRes = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!refreshRes.ok) {
        throw new Error('Session expired');
      }

      const refreshData = await refreshRes.json();
      if (!refreshData.authenticated || !refreshData.accessToken) {
        throw new Error('Session expired');
      }

      const newToken = refreshData.accessToken;
      setAccessToken(newToken);
      processQueue(null, newToken);

      config.headers.Authorization = `Bearer ${newToken}`;
      response = await fetch(url, config);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      setAccessToken(null);
      throw refreshErr;
    } finally {
      isRefreshing = false;
    }
  }

  return handleResponse(response);
}

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.message || 'Request failed');
    error.statusCode = response.status;
    error.code = data.error?.code;
    error.details = data.error?.details;
    throw error;
  }
  return data;
}
