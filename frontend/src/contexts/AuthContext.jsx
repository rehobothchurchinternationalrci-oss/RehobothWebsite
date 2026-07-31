/**
 * Authentication context — provides auth state to the entire app.
 *
 * Responsibilities:
 * - Check if the user is authenticated on mount
 * - Expose user object, loading states, and auth actions
 * - Centralise logout logic
 *
 * All actual auth I/O is delegated to authService.
 */

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { authService } from '@/services/auth/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const checkUserAuth = useCallback(async () => {
    // Skip if there is no token at all
    if (!authService.isAuthenticated()) {
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      return;
    }

    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const currentUser = await authService.me();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);

      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required',
        });
      } else if (error.data?.reason === 'user_not_registered') {
        setAuthError({
          type: 'user_not_registered',
          message: 'User not registered for this application',
        });
      } else {
        setAuthError({
          type: 'unknown',
          message: error.message || 'An unexpected error occurred',
        });
      }
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  // Check auth once on mount
  useEffect(() => {
    checkUserAuth();
  }, [checkUserAuth]);

  const logout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    authService.logout();
  }, []);

  const navigateToLogin = useCallback(() => {
    window.location.href = '/login';
  }, []);

  const value = {
    user,
    isAuthenticated,
    isLoadingAuth,
    authError,
    authChecked,
    logout,
    navigateToLogin,
    checkUserAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
