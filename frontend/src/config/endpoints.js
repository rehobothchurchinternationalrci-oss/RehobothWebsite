/**
 * Centralized API endpoint definitions.
 *
 * All API paths are defined here so that:
 * - They can be found/changed in one place
 * - Typos are caught at import time instead of runtime
 * - Adding a new endpoint is explicit and documented
 */

export const ENDPOINTS = Object.freeze({
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },

  // Future endpoints — add new sections here
  // MEMBERS: { ... },
  // EVENTS: { ... },
  // DONATIONS: { ... },
});
