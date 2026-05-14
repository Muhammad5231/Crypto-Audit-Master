import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  username: string;
  email: string;
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: true,
      isAuthenticated: false,
      setAuth: (userData, token) =>
        set({ user: userData, token, isLoading: false, isAuthenticated: true }),
      clearAuth: () =>
        set({ user: null, token: null, isLoading: false, isAuthenticated: false }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: "crypto-audit-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Helper: check if persist has hydrated (for localStorage, it's synchronous)
export function useAuthHydrated() {
  // localStorage-based persist hydrates synchronously
  // So if we're on the client, hydration has already happened
  if (typeof window === "undefined") return false;
  return true;
}
