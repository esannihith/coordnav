import { create } from "zustand";
import { ChatMessage } from "@/types/chat.types";
import { chatService } from "@/services/chat.service";

interface ChatState {
  messages: ChatMessage[]; // newest-first (suits an inverted list)
  isLoading: boolean;

  loadHistory: () => Promise<void>;
  addOptimistic: (message: ChatMessage) => void;
  receiveMessage: (message: ChatMessage) => void;
  failMessage: (clientId?: string) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,

  loadHistory: async () => {
    set({ isLoading: true });
    try {
      const messages = await chatService.getMessages({ limit: 50 });
      set({
        messages: messages.map((m) => ({ ...m, status: "sent" as const })),
        isLoading: false,
      });
    } catch {
      // Network/timeout/server error — keep what we have, stop loading.
      set({ isLoading: false });
    }
  },

  addOptimistic: (message) => {
    set((state) => ({ messages: [message, ...state.messages] }));
  },

  receiveMessage: (message) => {
    set((state) => {
      // Reconcile our own optimistic message by the echoed clientId.
      if (message.clientId) {
        const idx = state.messages.findIndex(
          (m) => m.clientId && m.clientId === message.clientId,
        );
        if (idx !== -1) {
          const next = [...state.messages];
          next[idx] = { ...message, status: "sent" };
          return { messages: next };
        }
      }
      // Dedup by server id (e.g. a reconnect replay).
      if (state.messages.some((m) => m.id === message.id)) return state;
      return { messages: [{ ...message, status: "sent" }, ...state.messages] };
    });
  },

  failMessage: (clientId) => {
    if (!clientId) return;
    set((state) => ({
      messages: state.messages.map((m) =>
        m.clientId === clientId ? { ...m, status: "failed" } : m,
      ),
    }));
  },

  reset: () => set({ messages: [], isLoading: false }),
}));
