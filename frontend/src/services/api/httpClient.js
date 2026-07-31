/**
 * Generic HTTP client wrapping the Fetch API.
 *
 * Features:
 * - Automatic JSON serialisation / deserialisation
 * - Automatic Bearer token injection from localStorage
 * - Centralised error handling (401 → auto-logout)
 * - Clean, promise-based API: httpClient.get / post / put / patch / delete
 */

import config from '@/config';

class HttpClient {
  #baseUrl;
  #defaultHeaders;
  #timeout;

  constructor(baseUrl = config.api.baseUrl, timeout = config.api.timeout) {
    this.#baseUrl = baseUrl;
    this.#timeout = timeout;
    this.#defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  // ── Private helpers ─────────────────────────────────────────

  #getAuthHeader() {
    const token = localStorage.getItem(config.auth.tokenKey);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async #request(method, endpoint, { body, headers, requiresAuth = true } = {}) {
    const url = `${this.#baseUrl}${endpoint}`;

    const requestHeaders = {
      ...this.#defaultHeaders,
      ...(requiresAuth ? this.#getAuthHeader() : {}),
      ...headers,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.#timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
        error.status = response.status;
        error.data = errorData;
        throw error;
      }

      // 204 No Content
      if (response.status === 204) return null;

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      // Timeout handling
      if (error.name === 'AbortError') {
        const timeoutError = new Error('Request timed out');
        timeoutError.status = 408;
        throw timeoutError;
      }

      // Auto-redirect on token expiry
      if (error.status === 401) {
        localStorage.removeItem(config.auth.tokenKey);
        localStorage.removeItem(config.auth.refreshTokenKey);
        window.location.href = config.auth.loginPath;
      }

      throw error;
    }
  }

  // ── Public API ──────────────────────────────────────────────

  get(endpoint, options) {
    return this.#request('GET', endpoint, options);
  }

  post(endpoint, body, options) {
    return this.#request('POST', endpoint, { body, ...options });
  }

  put(endpoint, body, options) {
    return this.#request('PUT', endpoint, { body, ...options });
  }

  patch(endpoint, body, options) {
    return this.#request('PATCH', endpoint, { body, ...options });
  }

  delete(endpoint, options) {
    return this.#request('DELETE', endpoint, options);
  }
}

/** Singleton instance configured from the app config */
export const httpClient = new HttpClient();

export default HttpClient;
