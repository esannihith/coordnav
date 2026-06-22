import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth.store";
import { useRoomStore } from "@/store/room.store";
import { useChatStore } from "@/store/chat.store";
import { ChatMessage, PlaceSnapshot } from "@/types/chat.types";
import { SOCKET_URL } from "./http";
import { refreshAccessToken } from "./api.client";
import * as Location from "expo-location";

let socketInstance: Socket | null = null;
let rosterRefreshTimeout: ReturnType<typeof setTimeout> | null = null;
let locationSubscription: Location.LocationSubscription | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

const startLocationTracking = async () => {
  const isSharingEnabled = useRoomStore.getState().isSharingEnabled;
  if (!isSharingEnabled) {
    return;
  }
  if (locationSubscription) {
    return;
  }
  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      try {
        await Location.enableNetworkProviderAsync();
      } catch (err) {
        console.warn("[Location] User declined to enable location services or network provider failed:", err);
        useRoomStore.getState().toggleSharingEnabled(false);
        return;
      }
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.warn("[Location] Permission to access location was denied");
      useRoomStore.getState().toggleSharingEnabled(false);
      return;
    }

    let lastEmitTime = 0;
    let lastLocation: Location.LocationObject | null = null;

    const emitLocation = (coords: { latitude: number; longitude: number }) => {
      const socket = socketInstance;
      if (socket && socket.connected) {
        socket.emit("location:update", {
          lat: coords.latitude,
          lng: coords.longitude,
        });
        lastEmitTime = Date.now();
      }
    };

    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      (location) => {
        lastLocation = location;
        const now = Date.now();
        if (now - lastEmitTime < 5000) {
          return;
        }
        emitLocation(location.coords);
      }
    );

    // Heartbeat to re-emit location every 15s when stationary
    heartbeatInterval = setInterval(() => {
      if (lastLocation) {
        const now = Date.now();
        if (now - lastEmitTime >= 15000) {
          emitLocation(lastLocation.coords);
        }
      }
    }, 15000);

  } catch (error) {
    console.error("[Location] Failed to start location tracking:", error);
    useRoomStore.getState().toggleSharingEnabled(false);
  }
};

const stopLocationTracking = () => {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  const socket = socketInstance;
  if (socket && socket.connected) {
    socket.emit("location:share:stop");
  }
};

const triggerDebouncedRosterRefresh = () => {
  if (rosterRefreshTimeout) {
    clearTimeout(rosterRefreshTimeout);
  }
  rosterRefreshTimeout = setTimeout(() => {
    void useRoomStore.getState().refreshRoster();
  }, 250);
};

// Optimistically add a chat message and emit it. The server echoes the clientId
// back on chat:new so the optimistic bubble reconciles to the authoritative row;
// chat:error (or a disconnected socket) marks it failed.
type OutgoingChat =
  | { kind: "TEXT"; text: string }
  | { kind: "PLACE"; place: PlaceSnapshot };

const sendChatMessage = (payload: OutgoingChat) => {
  const user = useAuthStore.getState().user;
  const room = useRoomStore.getState().room;
  if (!user || !room) return;

  const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const optimistic: ChatMessage = {
    id: clientId,
    roomId: room.id,
    sender: { id: user.id, name: user.name, picture: user.picture },
    kind: payload.kind,
    text: payload.kind === "TEXT" ? payload.text : undefined,
    place: payload.kind === "PLACE" ? payload.place : undefined,
    createdAt: new Date().toISOString(),
    clientId,
    status: "sending",
  };

  useChatStore.getState().addOptimistic(optimistic);

  const socket = socketInstance;
  if (socket && socket.connected) {
    socket.emit("chat:send", { clientId, ...payload });
  } else {
    useChatStore.getState().failMessage(clientId);
  }
};

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
      transports: ["websocket"],
    });

    // Handle token refresh on connection error
    socketInstance.on("connect_error", async (err) => {
      console.warn("Socket connection error:", err.message);

      const errData = (err as any).data;
      if (errData && errData.code === "TOKEN_EXPIRED") {
        try {
          const currentToken = useAuthStore.getState().accessToken;
          const authObj = socketInstance?.auth;
          const sentToken =
            typeof authObj === "object" && authObj !== null
              ? (authObj as any).token
              : null;

          let newToken = currentToken;
          if (currentToken && sentToken && currentToken !== sentToken) {
            console.log(
              "Socket token already refreshed by HTTP request, reusing...",
            );
          } else {
            newToken = await refreshAccessToken();
          }

          if (socketInstance) {
            socketInstance.auth = { token: newToken };
          }
        } catch (refreshErr: any) {
          if (refreshErr?.message !== "Session changed during refresh") {
            console.error(
              "Failed to refresh token for socket reconnection:",
              refreshErr,
            );
            void useAuthStore.getState().clearSessionLocal();
          } else {
            console.log(
              "Socket refresh bypassed: Session changed during refresh.",
            );
          }
        }
      } else if (errData && errData.code === "TOKEN_INVALID") {
        console.error("Socket authentication failed permanently:", err.message);
        void useAuthStore.getState().clearSessionLocal();
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
        void startLocationTracking();
      }
    });

    socketInstance.on("disconnect", () => {
      stopLocationTracking();
    });

    socketInstance.on("room:roster-changed", () => {
      triggerDebouncedRosterRefresh();
    });

    socketInstance.on("location:list", (list: any) => {
      useRoomStore.getState().setLocations(list);
    });

    socketInstance.on("location:update", (data: any) => {
      if (data && typeof data.userId === "string") {
        const { userId, ...payload } = data;
        useRoomStore.getState().setLocation(userId, payload);
      }
    });

    socketInstance.on("location:share:stopped", (data: any) => {
      if (data && typeof data.userId === "string") {
        useRoomStore.getState().removeLocation(data.userId);
      }
    });

    socketInstance.on("chat:new", (data: any) => {
      if (data && typeof data.id === "string") {
        useChatStore.getState().receiveMessage(data as ChatMessage);
      }
    });

    socketInstance.on("chat:error", (data: any) => {
      useChatStore.getState().failMessage(data?.clientId);
    });

    // Advisory: a newer device took over this account. Don't wipe blindly —
    // re-validate against the server. If the refresh token was superseded the
    // refresh fails and we log out locally (no /auth/signout, so the room stays
    // with the new device). If it succeeds (e.g. same-device reconnect), ignore.
    socketInstance.on("session:superseded", async () => {
      try {
        await refreshAccessToken();
      } catch (err: any) {
        if (err?.message !== "Session changed during refresh") {
          console.warn("Session superseded by another device; signing out.");
          void useAuthStore.getState().clearSessionLocal();
        }
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
        void startLocationTracking();
      }
    }
  },

  sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendChatMessage({ kind: "TEXT", text: trimmed });
  },

  sendPlace(place: PlaceSnapshot) {
    sendChatMessage({ kind: "PLACE", place });
  },

  leaveRoom() {
    stopLocationTracking();
    if (rosterRefreshTimeout) {
      clearTimeout(rosterRefreshTimeout);
      rosterRefreshTimeout = null;
    }
  },

  disconnect() {
    stopLocationTracking();
    if (rosterRefreshTimeout) {
      clearTimeout(rosterRefreshTimeout);
      rosterRefreshTimeout = null;
    }
    if (socketInstance) {
      socketInstance.disconnect();
    }
  },
};

// Reactively manage socket connection and location tracking based on store state
let previousRoomId: string | null = null;
let previousSharingEnabled = false;

useRoomStore.subscribe((state) => {
  const currentRoomId = state.room?.id ?? null;
  const isSharingEnabled = state.isSharingEnabled;

  if (currentRoomId !== previousRoomId) {
    if (currentRoomId) {
      socketClient.connect();
      // New room context: clear any prior chat and preload this room's history.
      useChatStore.getState().reset();
      void useChatStore.getState().loadHistory();
    } else {
      socketClient.leaveRoom();
      socketClient.disconnect();
      useChatStore.getState().reset();
      previousSharingEnabled = false; // Reset tracking state on exit
    }
    previousRoomId = currentRoomId;
  }

  // Handle location sharing toggle reactively
  if (currentRoomId && isSharingEnabled !== previousSharingEnabled) {
    if (isSharingEnabled) {
      void startLocationTracking();
    } else {
      stopLocationTracking();
    }
    previousSharingEnabled = isSharingEnabled;
  }
});
