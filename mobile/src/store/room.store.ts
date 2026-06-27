import { create } from "zustand";
import { Member, Room, Destination } from "@/types/room.types";
import { roomService } from "@/services/room.service";
import { useAuthStore } from "./auth.store";

// Pulls the room snapshot out of a 409 ALREADY_IN_ROOM response (single `{ data }`
// envelope), or null for any other error.
const extractAlreadyInRoom = (
  error: any,
): { room: Room; members: Member[] } | null => {
  const data = error?.response?.data?.data;
  if (error?.response?.status === 409 && data?.errorCode === "ALREADY_IN_ROOM") {
    return { room: data.room, members: data.members ?? [] };
  }
  return null;
};

const cleanLocations = (
  locations: Record<string, { lat: number; lng: number; updatedAt: string }>,
  members: Member[],
) => {
  const memberIds = new Set(members.map((m) => m.id));
  const newLocations = { ...locations };
  for (const userId in newLocations) {
    if (!memberIds.has(userId)) {
      delete newLocations[userId];
    }
  }
  return newLocations;
};

// Create/join either succeed (room is set in the store) or report that the user
// is already in a room (carrying its snapshot so the caller can offer Rejoin).
export type RoomEntryResult = {
  alreadyInRoom?: { room: Room; members: Member[] };
};

interface RoomState {
  room: Room | null;
  members: Member[];
  locations: Record<string, { lat: number; lng: number; updatedAt: string }>;
  isSharingEnabled: boolean;
  isLoading: boolean;
  actionLoading: boolean;
  error: string | null;
  tempSelectedDestination: Destination | null;
  setTempSelectedDestination: (dest: Destination | null) => void;
  createRoom: (name: string, destination?: Destination | null) => Promise<RoomEntryResult>;
  joinRoom: (roomCode: string) => Promise<RoomEntryResult>;
  applyRoomSnapshot: (room: Room | null, members: Member[]) => void;
  leaveRoom: () => Promise<void>;
  loadCurrentRoom: (timeoutMs?: number) => Promise<void>;
  refreshRoster: () => Promise<void>;
  setLocations: (list: { userId: string; lat: number; lng: number; updatedAt: string }[]) => void;
  setLocation: (userId: string, payload: { lat: number; lng: number; updatedAt: string }) => void;
  removeLocation: (userId: string) => void;
  toggleSharingEnabled: (enabled: boolean) => void;
  updateDestination: (destination: Destination | null) => Promise<void>;
}

export const useRoomStore = create<RoomState>((set) => ({
  room: null,
  members: [],
  locations: {},
  isSharingEnabled: false,
  isLoading: true,
  actionLoading: false,
  error: null,
  tempSelectedDestination: null,
  setTempSelectedDestination: (dest) => set({ tempSelectedDestination: dest }),
  createRoom: async (name: string, destination?: Destination | null): Promise<RoomEntryResult> => {
    set({ actionLoading: true, error: null });
    try {
      const { room, members } = await roomService.createRoom(name, destination);
      set({ room, members, locations: {}, isSharingEnabled: false, actionLoading: false, tempSelectedDestination: null });
      return {};
    } catch (error: any) {
      const conflict = extractAlreadyInRoom(error);
      if (conflict) {
        set({ actionLoading: false });
        return { alreadyInRoom: conflict };
      }
      set({
        actionLoading: false,
        error: error.response?.data?.message ?? error.message,
      });
      return {};
    }
  },
  joinRoom: async (roomCode: string): Promise<RoomEntryResult> => {
    set({ actionLoading: true, error: null });
    try {
      const { room, members } = await roomService.joinRoom(roomCode);
      set({ room, members, locations: {}, isSharingEnabled: false, actionLoading: false });
      return {};
    } catch (error: any) {
      const conflict = extractAlreadyInRoom(error);
      if (conflict) {
        set({ actionLoading: false });
        return { alreadyInRoom: conflict };
      }
      set({
        actionLoading: false,
        error: error.response?.data?.message ?? error.message,
      });
      return {};
    }
  },
  applyRoomSnapshot: (room: Room | null, members: Member[]) => {
    set({
      room,
      members,
      locations: {},
      isSharingEnabled: false,
      isLoading: false,
      actionLoading: false,
      error: null,
    });
  },
  leaveRoom: async () => {
    set({ actionLoading: true, error: null });
    try {
      await roomService.leaveRoom();
      set({ room: null, members: [], locations: {}, isSharingEnabled: false, actionLoading: false });
    } catch (error: any) {
      if (error.response?.status === 404) {
        // If membership was not found (e.g. deleted by previous timed-out request),
        // clear local room state so the user is not stuck.
        set({
          room: null,
          members: [],
          locations: {},
          isSharingEnabled: false,
          actionLoading: false,
          error: null,
        });
      } else {
        set({
          actionLoading: false,
          error: error.response?.data?.message ?? error.message,
        });
      }
    }
  },
  loadCurrentRoom: async (timeoutMs?: number) => {
    set({ isLoading: true, error: null });
    try {
      const { room, members } = await roomService.getCurrentRoom(
        timeoutMs ? { timeoutMs } : undefined,
      );
      set({ room, members, locations: {}, isLoading: false, isSharingEnabled: false, error: null });
    } catch (error: any) {
      if (error.response?.status === 404) {
        set({
          room: null,
          members: [],
          locations: {},
          isSharingEnabled: false,
          isLoading: false,
          error: null,
        });
      } else if (!error.response) {
        // No response = network error / timeout (e.g. boot while the server is
        // down or slow). Don't block the UI or show a banner — just stop loading
        // and leave the room unloaded.
        set({ isLoading: false, error: null });
      } else {
        set({
          isLoading: false,
          error: error.response?.data?.message ?? error.message,
        });
      }
    }
  },
  refreshRoster: async () => {
    try {
      const { members } = await roomService.getCurrentRoom();
      set((state) => ({
        members,
        locations: cleanLocations(state.locations, members),
        error: null,
      }));
    } catch (error: any) {
      if (error.response?.status === 404) {
        set({
          room: null,
          members: [],
          locations: {},
          isSharingEnabled: false,
          error: null,
        });
      } else {
        set({
          error: error.response?.data?.message ?? error.message,
        });
      }
    }
  },
  setLocations: (list) => {
    set((state) => {
      const memberIds = new Set(state.members.map((m) => m.id));
      const filteredLocations: Record<string, { lat: number; lng: number; updatedAt: string }> = {};
      list.forEach((item) => {
        if (memberIds.has(item.userId)) {
          filteredLocations[item.userId] = {
            lat: item.lat,
            lng: item.lng,
            updatedAt: item.updatedAt,
          };
        }
      });
      return { locations: filteredLocations };
    });
  },
  setLocation: (userId, payload) => {
    set((state) => {
      // Check if user is in members list before storing their location
      const isMember = state.members.some((m) => m.id === userId);
      if (!isMember) return state;

      return {
        locations: {
          ...state.locations,
          [userId]: payload,
        },
      };
    });
  },
  removeLocation: (userId) => {
    set((state) => {
      const newLocations = { ...state.locations };
      delete newLocations[userId];
      return {
        locations: newLocations,
      };
    });
  },
  toggleSharingEnabled: (enabled) => {
    set({ isSharingEnabled: enabled });
  },
  updateDestination: async (destination) => {
    set({ actionLoading: true, error: null });
    try {
      const { room, members } = await roomService.updateDestination(destination);
      set({ room, members, actionLoading: false });
    } catch (error: any) {
      set({
        actionLoading: false,
        error: error.response?.data?.message ?? error.message,
      });
    }
  },
}));

// Reset room store when user logs out
useAuthStore.subscribe((state) => {
  if (!state.user) {
    useRoomStore.setState({
      room: null,
      members: [],
      locations: {},
      isSharingEnabled: false,
      isLoading: true,
      error: null,
      tempSelectedDestination: null,
    });
  }
});
