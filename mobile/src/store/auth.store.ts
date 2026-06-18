// src/store/auth.store
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { User, Session } from "@/types/user.types";
import { authService } from "@/services/auth.service";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  hasHydrated: boolean;
  isAuthLoading: boolean;

  setAccessToken: (token : string) => void;
  setSession: (session: Session) => Promise<void>;
  loadSession: () => Promise<void>;
  clearSession: () => Promise<void>;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      hasHydrated: false,
      isAuthLoading: true,

      setAccessToken: (token : string) => {
        set({
          accessToken : token,
        })
      },

      setSession: async (session: Session) => {
        await SecureStore.setItemAsync("refreshToken", session.tokens.refreshToken);

        set({
          user: session.user,
          accessToken: session.tokens.accessToken,
        });
      },

      loadSession: async () => {
        // Wait for store rehydration to complete to avoid race conditions where
        // rehydrated data overwrites session load/clear actions.
        await new Promise<void>((resolve) => {
          if (useAuthStore.getState().hasHydrated) {
            resolve();
          } else {
            const unsubscribe = useAuthStore.subscribe((state) => {
              if (state.hasHydrated) {
                unsubscribe();
                resolve();
              }
            });
          }
        });

        set({ isAuthLoading: true });

        const storedRefreshToken = await SecureStore.getItemAsync("refreshToken");
        if (!storedRefreshToken) {
          set({ user: null, accessToken: null, isAuthLoading: false });
          return;
        }

        try {
          const tokens = await authService.refresh(storedRefreshToken);
          await SecureStore.setItemAsync("refreshToken", tokens.refreshToken);
          set({ accessToken: tokens.accessToken, isAuthLoading: false });
        } catch {
          await SecureStore.deleteItemAsync("refreshToken").catch(() => {});
          set({ user: null, accessToken: null, isAuthLoading: false });
        }
      },

      clearSession: async () => {
        const storedRefreshToken = await SecureStore.getItemAsync("refreshToken");

        if (storedRefreshToken) {
          try {
            await authService.signOut(storedRefreshToken);
          } catch {
            // Ignore network/API errors — still clear the local session.
          }
        }

        await SecureStore.deleteItemAsync("refreshToken").catch(() => {});

        set({
          user: null,
          accessToken: null,
          isAuthLoading: false,
        });
      },

      setHasHydrated: (value) => {
        set({ hasHydrated: value });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),

      partialize: (state) => ({
        user: state.user,
      }),

      onRehydrateStorage: () => () => {
        useAuthStore.getState().setHasHydrated(true);
      },
    }
  )
);