/**
 * Centralized application configuration.
 *
 * All environment-specific values are read from Vite env variables
 * (prefixed with VITE_) and exposed through this single module.
 * Components and services should NEVER read import.meta.env directly.
 */

const config = {
  app: {
    name: 'Rehoboth Church International',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  },

  api: {
    /** Base URL for the Flask backend */
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
    /** Default request timeout in ms */
    timeout: 10_000,
  },

  auth: {
    /** Route paths */
    loginPath: '/login',
    /** localStorage keys */
    tokenKey: 'auth_token',
    refreshTokenKey: 'refresh_token',
  },
};

export default Object.freeze(config);
