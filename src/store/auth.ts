import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('shiphub_token', token);
        set({ user, token });
      },
      clearAuth: () => {
        localStorage.removeItem('shiphub_token');
        set({ user: null, token: null });
      },
    }),
    { name: 'shiphub_auth' }
  )
);
