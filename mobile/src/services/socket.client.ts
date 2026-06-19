import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth.store";
import { useRoomStore } from "@/store/room.store";
import { SOCKET_URL, refreshAccessToken } from "./api.client";

let socketInstance: Socket | null = null;

export const socketClient = {
  getSocket(): Socket {
    if (socketInstance) {
      return socketInstance;
    }

    socketInstance = io(SOCKET_URL, {
      auth: {
        token: useAuthStore.getState().accessToken,
      },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Handle token refresh on connection error
    socketInstance.on("connect_error", async (err) => {
      console.warn("Socket connection error:", err.message);

      const errData = (err as any).data;
      if (errData && errData.code === "TOKEN_EXPIRED") {
        try {
          const newToken = await refreshAccessToken();
          if (socketInstance) {
            socketInstance.auth = { token: newToken };
          }
        } catch (refreshErr) {
          console.error("Failed to refresh token for socket reconnection:", refreshErr);
          void useAuthStore.getState().clearSession();
        }
      } else if (errData && errData.code === "TOKEN_INVALID") {
        console.error("Socket authentication failed permanently:", err.message);
        void useAuthStore.getState().clearSession();
      } else {
        // Codeless transport/network error - let Socket.IO's built-in reconnection retry
        console.warn("Socket transport error, retrying reconnection...");
      }
    });

    // Re-join active room automatically upon connection/reconnection
    socketInstance.on("connect", () => {
      const room = useRoomStore.getState().room;
      if (room && socketInstance) {
        socketInstance.emit("room:join", { roomId: room.id });
      }
    });

    // Global event listeners feeding into the room store
    socketInstance.on("presence:list", (onlineUserIds: string[]) => {
      useRoomStore.getState().setOnlineUserIds(onlineUserIds);
    });

    socketInstance.on("presence:update", ({ userId, online }: { userId: string; online: boolean }) => {
      if (online) {
        useRoomStore.getState().addOnlineUserId(userId);
      } else {
        useRoomStore.getState().removeOnlineUserId(userId);
      }
    });

    return socketInstance;
  },

  connect() {
    const socket = this.getSocket();
    if (!socket.connected) {
      // Refresh the token reference before connecting
      socket.auth = { token: useAuthStore.getState().accessToken };
      socket.connect();
    } else {
      // If already connected, emit room:join for the active room (if any)
      const room = useRoomStore.getState().room;
      if (room) {
        socket.emit("room:join", { roomId: room.id });
      }
    }
  },

  leaveRoom() {
    if (socketInstance && socketInstance.connected) {
      socketInstance.emit("room:leave");
    }
  },

  disconnect() {
    if (socketInstance) {
      socketInstance.disconnect();
    }
  }
};
