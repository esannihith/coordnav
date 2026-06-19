import { create } from "zustand";
import { Member, Room } from "@/types/room.types";
import { roomService } from "@/services/room.service";
import { useAuthStore } from "./auth.store";

interface RoomState {
    room : Room | null,
    members : Member[],
    isLoading : boolean, 
    actionLoading : boolean, 
    error : string | null, 

    createRoom : (name : string) => Promise<void>,
    joinRoom : (roomCode : string) => Promise<void>,
    leaveRoom : () => Promise<void>,
    loadCurrentRoom : () => Promise<void>
}

export const useRoomStore = create<RoomState>((set) => ({
    room : null,
    members : [],
    isLoading : true,
    actionLoading : false,
    error : null,
    createRoom : async (name : string) => {
        set({ actionLoading : true, error : null })
        try {
            const { room, members } = await roomService.createRoom(name)
            set({ room, members, actionLoading : false })
        } catch (error : any) {
            set({ actionLoading : false, error : error.response?.data?.message ?? error.message })
        }
    },
    joinRoom : async (roomCode : string) => {
        set({ actionLoading : true, error : null })
        try {
            const { room, members } = await roomService.joinRoom(roomCode)
            set({ room, members, actionLoading : false })
        } catch (error : any) {
            set({ actionLoading : false, error : error.response?.data?.message ?? error.message })
        }
    },
    leaveRoom : async () => {
        set({ actionLoading : true, error : null })
        try {
            await roomService.leaveRoom()
            set({ room : null, members : [], actionLoading : false })
        } catch (error : any) {
            set({ actionLoading : false, error : error.response?.data?.message ?? error.message })
        }
    },
    loadCurrentRoom : async () => {
        set({ isLoading : true, error : null })
        try {
            const { room, members } = await roomService.getCurrentRoom()
            set({ room, members, isLoading : false, error : null })
        } catch (error : any) {
            if (error.response?.status === 404) {
                set({ room : null, members : [], isLoading : false, error : null })
            } else {    
                set({ isLoading : false, error : error.response?.data?.message ?? error.message })
            }
        }
    }
}))

// Reset room store when user logs out
useAuthStore.subscribe((state) => {
    if (!state.user) {
        useRoomStore.setState({ room: null, members: [], isLoading: true, error: null });
    }
});