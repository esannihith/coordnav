import React from "react";
import { View, ActivityIndicator } from "react-native";
import { useAuthStore } from "@/store/auth.store";
import { useRoomStore } from "@/store/room.store";
import { RoomSignedOutView } from "./RoomSignedOutView";
import { RoomLobbyView } from "./RoomLobbyView";
import { RoomActiveView } from "./RoomActiveView";

export function RoomTab() {
  const user = useAuthStore((s) => s.user);
  const room = useRoomStore((s) => s.room);
  const isLoading = useRoomStore((s) => s.isLoading);

  if (!user) {
    return <RoomSignedOutView />;
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (room) {
    return <RoomActiveView />;
  }

  return <RoomLobbyView />;
}
