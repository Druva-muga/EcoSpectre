import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types';
import { api } from '../services/api';

const TOKEN_KEY = 'AUTH_TOKEN';
const USER_KEY = 'AUTH_USER';

interface AuthState {
  isAuthenticated: boolean;
  isAuthReady: boolean;
  user: User | null;
  signIn: (user: User, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  initialize: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isAuthReady: false,
  user: null,
  signIn: async (user: User, token: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ isAuthenticated: true, user, isAuthReady: true });
  },
  signOut: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    await api.logout();
    set({ isAuthenticated: false, user: null });
  },
  updateUser: (updates) => {
    const state = get();
    const updatedUser = state.user ? { ...state.user, ...updates } : null;
    if (updatedUser) {
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(updatedUser));
      set({ user: updatedUser });
    }
  },
  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userStr = await SecureStore.getItemAsync(USER_KEY);
      
      if (token && userStr) {
        const user = JSON.parse(userStr) as User;
        set({ isAuthenticated: true, user, isAuthReady: true });
      } else {
        set({ isAuthReady: true });
      }
    } catch (error) {
      console.error('[Auth] Initialize error:', error);
      set({ isAuthReady: true });
    }
  },
}));