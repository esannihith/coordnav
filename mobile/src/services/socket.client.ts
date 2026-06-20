import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth.store";
import { useRoomStore } from "@/store/room.store";
import { SOCKET_URL } from "./http";
import { refreshAccessToken } from "./api.client";
import * as Location from "expo-location";

let socketInstance: Socket | null = null;
let rosterRefreshTimeout: ReturnType<typeof setTimeout> | null = null;
let locationSubscription: Location.LocationSubscription | null = null;

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
        return;
      }
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.warn("[Location] Permission to access location was denied");
      return;
    }

    let lastEmitTime = 0;
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      (location) => {
        const now = Date.now();
        if (now - lastEmitTime < 5000) {
          return;
        }

        const socket = socketInstance;
        if (socket && socket.connected) {
          socket.emit("location:update", {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          });
          lastEmitTime = now;
        }
      }
    );
  } catch (error) {
    console.error("[Location] Failed to start location tracking:", error);
  }
};

const stopLocationTracking = () => {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
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
            void useAuthStore.getState().clearSession();
          } else {
            console.log(
              "Socket refresh bypassed: Session changed during refresh.",
            );
          }
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
    } else {
      socketClient.leaveRoom();
      socketClient.disconnect();
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
