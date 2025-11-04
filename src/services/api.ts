import { ScanContext, SustainabilityScore, User, ScanRecord } from '../types';
import * as SecureStore from 'expo-secure-store';
import { Platform, NativeModules } from 'react-native';

function getDevApiBase(): string {
  try {
    // Works in Expo Go: derive host from JS bundle URL
    // e.g., "http://192.168.0.10:8081/index.bundle?platform=android&dev=true"
    const scriptURL: string | undefined = (NativeModules as any)?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/https?:\/\/([^/:]+)(?::\d+)?/i);
      const host = match?.[1];
      if (host) {
        return `http://${host}:5000/api`;
      }
    }
  } catch {}
  // Fallback (may fail on real device if backend not reachable at localhost)
  return 'http://localhost:5000/api';
}

const API_URL = __DEV__
  ? getDevApiBase()
  : 'https://your-production-url.com/api';

const TOKEN_KEY = 'AUTH_TOKEN';

async function getAuthToken() {
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

async function setAuthToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function clearAuthToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const url = `${API_URL}${endpoint}`;
  // Add timeout + abort support
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased to 15s for auth
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      console.error('[API] Request failed', {
        url,
        status: response.status,
        message: error.message,
      });
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw error;
  }
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const response = await fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await setAuthToken(response.token);
    return { token: response.token, user: response.user };
  },

  async register(email: string, password: string) {
    const response = await fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await setAuthToken(response.token);
    return { token: response.token, user: response.user };
  },

  async logout() {
    await clearAuthToken();
  },

  // Scans
  async createScan(scanContext: ScanContext, score: SustainabilityScore, action: 'consumed' | 'rejected') {
    return fetchWithAuth('/scans', {
      method: 'POST',
      body: JSON.stringify({ ...scanContext, score, action }),
    });
  },

  async getScans(startDate?: Date, endDate?: Date) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    
    return fetchWithAuth(`/scans?${params}`);
  },

  // User
  async updateSettings(settings: User['settings']) {
    return fetchWithAuth('/users/settings', {
      method: 'PATCH',
      body: JSON.stringify({ settings }),
    });
  },

  async deleteAccount() {
    await fetchWithAuth('/users', {
      method: 'DELETE',
    });
    await clearAuthToken();
  },
};