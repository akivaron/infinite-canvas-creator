import { apiClient } from './api';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  email: string;
  created_at: string;
}

export const authService = {
  async signUp(email: string, password: string) {
    const response = await apiClient.register(email, password);
    return {
      user: response.user as User,
      token: response.token,
    };
  },

  async signIn(email: string, password: string) {
    const response = await apiClient.login(email, password);
    return {
      user: response.user as User,
      token: response.token,
    };
  },

  async signOut() {
    await apiClient.logout();
  },

  async getCurrentUser() {
    try {
      const profile = await apiClient.getMe();
      return profile as User;
    } catch (error) {
      return null;
    }
  },

  async getCurrentSession() {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;

    try {
      const user = await apiClient.getMe();
      return { user, token };
    } catch (error) {
      return null;
    }
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>) {
    return await apiClient.updateProfile(updates);
  },

  async getProfile(userId: string) {
    try {
      return await apiClient.getMe();
    } catch (error) {
      return null;
    }
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return {
      data: {
        subscription: {
          unsubscribe: () => {},
        },
      },
    };
  },
};
