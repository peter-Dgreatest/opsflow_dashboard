import axios from 'axios';

// ── Base client ───────────────────────────────────────────────────────────────
// withCredentials = true so the browser sends/receives HttpOnly cookies.
// The backend must respond with:
//   Set-Cookie: accessToken=…; HttpOnly; SameSite=Strict; Path=/
//   Set-Cookie: refreshToken=…; HttpOnly; SameSite=Strict; Path=/api/auth/refresh
//
// Vite proxy forwards /api → http://localhost:4000/api in development,
// so credentials are treated as same-origin by the browser.

// src/api/client.js — add one header to every web request
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://profitnko.com/profitnko1/api', //
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'x-client-type': 'web',              // backend uses this to set cookies
  },
  timeout: 15000,
});

let rrt = import.meta.env.VITE_API_URL || 'https://profitnko.com/profitnko1/api';
console.log('rrt', rrt);

// ── Silent refresh ────────────────────────────────────────────────────────────
let isRefreshing = false;
let refreshQueue = [];   // queued failed requests waiting on the new token

const drainQueue = (error) => {
  refreshQueue.forEach(cb => cb(error));
  refreshQueue = [];
};

// ── Response interceptor ──────────────────────────────────────────────────────
// On 401: POST /auth/refresh (the browser sends the refreshToken cookie
// automatically), then replay the original request.
// If refresh itself fails, fire 'auth:logout' so the app returns to Login.
client.interceptors.response.use(
  res => res,
  async (err) => {
    const original = err.config;

    if (
      err.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh') &&
      !original.url?.includes('/auth/signin')
    ) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push(e => (e ? reject(e) : resolve(client(original))));
        });
      }

      isRefreshing = true;
      try {
        await client.post('/auth/refresh', {});
        isRefreshing = false;
        drainQueue(null);
        return client(original);
      } catch (refreshErr) {
        isRefreshing = false;
        drainQueue(refreshErr);
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(new Error('Session expired. Please sign in again.'));
      }
    }

    const msg = err.response?.data?.message || err.message || 'Request failed';
    return Promise.reject(new Error(msg));
  }
);

export default client;
