import { create } from 'zustand';

export interface AlertAction {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
}

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  actions: AlertAction[];
  showAlert: (title: string, message?: string, actions?: AlertAction[]) => void;
  hideAlert: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  visible: false,
  title: '',
  message: '',
  actions: [],
  showAlert: (title, message = '', actions = [{ text: 'OK' }]) =>
    set({ visible: true, title, message, actions }),
  hideAlert: () => set({ visible: false, title: '', message: '', actions: [] }),
}));
