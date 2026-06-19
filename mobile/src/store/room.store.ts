import { create } from "zustand";
import { Member, Room } from "@/types/room.types";
import { roomService } from "@/services/room.service";
import { useAuthStore } from "./auth.store";
import { socketClient } from "@/services/socket.client";

interface RoomState {
    room : Room | null,
    members : Member[],
    onlineUserIds : string[],
    isLoading : boolean, 
    actionLoading : boolean, 
    error : string | null, 

    createRoom : (name : string) => Promise<void>,
    joinRoom : (roomCode : string) => Promise<void>,
    leaveRoom : () => Promise<void>,
    loadCurrentRoom : () => Promise<void>,
    setOnlineUserIds : (ids : string[]) => void,
    addOnlineUserId : (id : string) => void,
    removeOnlineUserId : (id : string) => void
}

export const useRoomStore = create<RoomState>((set) => ({
    room : null,
    members : [],
    onlineUserIds : [],
    isLoading : true,
    actionLoading : false,
    error : null,
    createRoom : async (name : string) => {
        set({ actionLoading : true, error : null })
        try {
                        const { room, members } = await roomService.createRoom(name)
            set({ room, members, actionLoading : false })
            socketClient.connect();
        } catch (error : any) {
            set({ actionLoading : false, error : error.response?.data?.message ?? error.message })
        }
    },
    joinRoom : async (roomCode : string) => {
        set({ actionLoading : true, error : null })
        try {
                        const { room, members } = await roomService.joinRoom(roomCode)
            set({ room, members, actionLoading : false })
            socketClient.connect();
        } catch (error : any) {
            set({ actionLoading : false, error : error.response?.data?.message ?? error.message })
        }
    },
    leaveRoom : async () => {
        set({ actionLoading : true, error : null })
        try {
            await roomService.leaveRoom()
            socketClient.leaveRoom();
            set({ room : null, members : [], onlineUserIds : [], actionLoading : false })
        } catch (error : any) {
            set({ actionLoading : false, error : error.response?.data?.message ?? error.message })
        }
    },
    loadCurrentRoom : async () => {
        set({ isLoading : true, error : null })
        try {
                        const { room, members } = await roomService.getCurrentRoom()
            set({ room, members, isLoading : false, error : null })
            socketClient.connect();
        } catch (error : any) {
            if (error.response?.status === 404) {
                socketClient.leaveRoom();
                set({ room : null, members : [], onlineUserIds : [], isLoading : false, error : null })
            } else {    
                set({ isLoading : false, error : error.response?.data?.message ?? error.message })
            }
        }
    },
    setOnlineUserIds : (ids) => set({ onlineUserIds : ids }),
    addOnlineUserId : (id) => set((state) => {
        if (state.onlineUserIds.includes(id)) return state;
        return { onlineUserIds : [...state.onlineUserIds, id] };
    }),
    removeOnlineUserId : (id) => set((state) => ({
        onlineUserIds : state.onlineUserIds.filter(x => x !== id)
    }))
}))

// Reset room store when user logs out
useAuthStore.subscribe((state) => {
    if (!state.user) {
        socketClient.disconnect();
        useRoomStore.setState({ room: null, members: [], onlineUserIds: [], isLoading: true, error: null });
    }
});