import { apiClient } from "./http";
import { Member, Room } from "@/types/room.types";

export const roomService = {
  createRoom: async (
    name: string,
  ): Promise<{ room: Room; members: Member[] }> => {
    try {
      const response = await apiClient.post("/room", { name: name });
      const { room, members } = response.data.data;
      return { room, members };
    } catch (error) {
      console.error("Create Room Error:", error);
      throw error;
    }
  },
  getCurrentRoom: async (options?: {
    timeoutMs?: number;
  }): Promise<{ room: Room; members: Member[] }> => {
    try {
      const response = await apiClient.get(
        "/room",
        options?.timeoutMs ? { timeout: options.timeoutMs } : undefined,
      );
      const { room, members } = response.data.data;
      return { room, members };
    } catch (error) {
      console.error("Get Current Room Error:", error);
      throw error;
    }
  },
  joinRoom: async (
    roomCode: string,
  ): Promise<{ room: Room; members: Member[] }> => {
    try {
      const response = await apiClient.post("/room/join", { code: roomCode });
      const { room, members } = response.data.data;
      return { room, members };
    } catch (error) {
      console.error("Join Room Error:", error);
      throw error;
    }
  },
  leaveRoom: async (): Promise<{ left: boolean }> => {
    try {
      const response = await apiClient.post("/room/leave");
      return response.data.data;
    } catch (error) {
      console.error("Leave Room Error:", error);
      throw error;
    }
  },
};
