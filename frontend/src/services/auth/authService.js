/**
 * Authentication service — abstracts all auth operations.
 *
 * This is the ONLY module that should know how authentication works.
 * Components call authService methods; they never touch localStorage
 * or HTTP endpoints directly.
 *
 * Backend: Flask API backed by Supabase Auth.
 */

import { httpClient } from '@/services/api/httpClient';
import { ENDPOINTS } from '@/config/endpoints';
import config from '@/config';

export const authService = {
  /**
   * Log in with email + password.
   * Stores the token on success.
   */
  async login(email, password) {
    const res = await httpClient.post(
      ENDPOINTS.AUTH.LOGIN,
      { email, password },
      { requiresAuth: false },
    );
    const data = res && res.success !== undefined ? res.data : res;
    if (data?.access_token) {
      localStorage.setItem(config.auth.tokenKey, data.access_token);
    }
    return data;
  },

  /**
   * Fetch the currently authenticated user profile.
   */
  async me() {
    const res = await httpClient.get(ENDPOINTS.AUTH.ME);
    return res && res.success !== undefined ? res.data : res;
  },

  /**
   * Request a password-reset email.
   */
  async forgotPassword(email) {
    const res = await httpClient.post(
      ENDPOINTS.AUTH.FORGOT_PASSWORD,
      { email },
      { requiresAuth: false },
    );
    return res && res.success !== undefined ? res.data : res;
  },

  /**
   * Reset the password using the token from the reset email.
   */
  async resetPassword(resetToken, newPassword) {
    const res = await httpClient.post(
      ENDPOINTS.AUTH.RESET_PASSWORD,
      { reset_token: resetToken, new_password: newPassword },
      { requiresAuth: false },
    );
    return res && res.success !== undefined ? res.data : res;
  },

  /**
   * Change current password (requires authenticated user).
   */
  async changePassword(newPassword) {
    const res = await httpClient.post(
      ENDPOINTS.AUTH.RESET_PASSWORD,
      { new_password: newPassword },
      { requiresAuth: true },
    );
    return res && res.success !== undefined ? res.data : res;
  },

  /**
   * Clear all tokens and redirect to login.
   */
  logout() {
    localStorage.removeItem(config.auth.tokenKey);
    localStorage.removeItem(config.auth.refreshTokenKey);
    window.location.href = config.auth.loginPath;
  },

  /**
   * Read the stored token (e.g. to check if a session exists).
   */
  getToken() {
    return localStorage.getItem(config.auth.tokenKey);
  },

  /**
   * Quick boolean check — does a token exist?
   * Note: does NOT verify token validity.
   */
  isAuthenticated() {
    return !!this.getToken();
  },
};
