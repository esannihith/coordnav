import { apiClient } from "./http";
import { ChatMessage } from "@/types/chat.types";

export const chatService = {
  // Newest-first page of the current room's messages, scoped server-side to the
  // caller's membership window (createdAt >= joinedAt) and capped at `limit`.
  getMessages: async (params?: {
    limit?: number;
    before?: string;
  }): Promise<ChatMessage[]> => {
    try {
      const response = await apiClient.get("/room/messages", { params });
      return response.data.data.messages as ChatMessage[];
    } catch (error) {
      console.error("Get Messages Error:", error);
      throw error;
    }
  },
};
