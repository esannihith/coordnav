import "react-native-gesture-handler";
import "../../global.css";
import { Slot } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/auth.store";
import { useRoomStore } from "@/store/room.store";
import { useUpdates } from "@/hooks/useUpdates";
import { ToastHost } from "@/components/feedback/ToastHost";
import { GlobalAlert } from "@/components/feedback/GlobalAlert";
import { View, ActivityIndicator } from "react-native";
import "@/services/api.client";
import "@/services/socket.client";

function RootLayout() {
  useUpdates();
  const loadSession = useAuthStore((state) => state.loadSession);
  const user = useAuthStore((state) => state.user);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);
  const loadCurrentRoom = useRoomStore((state) => state.loadCurrentRoom);

  // 1. Initial boot flow
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const hasSession = await loadSession();
        if (hasSession) {
          await loadCurrentRoom();
          useAuthStore.getState().setAuthLoading(false);
        }
      } catch (error) {
        console.error("Boot verification failed:", error);
        useAuthStore.getState().setAuthLoading(false);
      }
    };
    bootstrap();
  }, [loadSession, loadCurrentRoom]);

  // 3. Render splash screen during auth boot check
  if (isAuthLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "black",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Slot />
        <ToastHost />
        <GlobalAlert />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default RootLayout;
