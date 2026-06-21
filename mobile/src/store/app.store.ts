import { create } from 'zustand';

export type SheetState = 'Home' | 'CreateRoom' | 'InRoom';

interface AppState {
  uiState: SheetState;
  setUiState: (next: SheetState) => void;
}

export const useAppStore = create<AppState>((set) => ({
  uiState: 'Home',
  setUiState: (next) => set({ uiState: next }),
}));
