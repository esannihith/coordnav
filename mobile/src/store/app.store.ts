import { create } from 'zustand';

export type SheetState = 'Home' | 'CreateRoom' | 'InRoom';

interface AppState {
  uiState: SheetState;
  setUiState: (next: SheetState) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

export const useAppStore = create<AppState>((set) => ({
  uiState: 'Home',
  setUiState: (next) => set({ uiState: next }),
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
}));
