import { create } from 'zustand';
import { authService } from '@/services/auth/authService';

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: authService.isAuthenticated(),
  isLoading: false,
  error: null,
  notifications: [],

  // Login action
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authService.login(email, password);
      const userProfile = await authService.me();
      set({
        user: userProfile,
        isAuthenticated: true,
        isLoading: false,
      });
      get().addNotification({
        id: Date.now(),
        type: 'success',
        message: `Bienvenue, ${userProfile.prenom || userProfile.email} !`,
      });
      return userProfile;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Échec de la connexion';
      set({ error: errMsg, isLoading: false, isAuthenticated: false, user: null });
      get().addNotification({
        id: Date.now(),
        type: 'error',
        message: errMsg,
      });
      throw err;
    }
  },

  // Logout action
  logout: () => {
    authService.logout();
    set({ user: null, isAuthenticated: false, error: null });
  },

  // Check current auth status action
  checkAuth: async () => {
    if (!authService.isAuthenticated()) {
      set({ isAuthenticated: false, user: null, isLoading: false });
      return;
    }
    set({ isLoading: true });
    try {
      const userProfile = await authService.me();
      set({ user: userProfile, isAuthenticated: true, isLoading: false });
    } catch (err) {
      console.error('CheckAuth error:', err);
      // If unauthorized, logout
      if (err.status === 401 || err.status === 403) {
        authService.logout();
        set({ user: null, isAuthenticated: false });
      }
      set({ isLoading: false });
    }
  },

  // Notification management
  addNotification: (notification) => {
    set((state) => ({
      notifications: [
        ...state.notifications,
        { id: Date.now(), ...notification, read: false },
      ],
    }));
  },

  markNotificationAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },

  clearNotifications: () => {
    set({ notifications: [] });
  },
}));
