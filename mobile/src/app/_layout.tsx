import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../../global.css";
import { Slot } from "expo-router";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore, useRoomStore, useAppStore } from "@/store";
import { useUpdates } from "@/hooks/useUpdates";
import { GlobalAlert } from "@/components/feedback/GlobalAlert";
import { SystemBars } from "react-native-edge-to-edge";
import { View, ActivityIndicator, LogBox } from "react-native";
import "@/services/api.client";
import "@/services/socket.client";

// Suppress InteractionManager deprecation warnings
LogBox.ignoreLogs([
  "InteractionManager has been deprecated",
]);

// Bound the boot-time room load so a down/slow server doesn't hold the splash
// for the full request timeout; the app proceeds with no room loaded.
const BOOT_ROOM_LOAD_TIMEOUT_MS = 5000;

function RootLayout() {
  useUpdates();
  const loadSession = useAuthStore((state) => state.loadSession);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);
  const theme = useAppStore((state) => state.theme);

  // 1. Initial boot flow
  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        const hasSession = await loadSession();
        if (hasSession && active) {
          await useRoomStore.getState().loadCurrentRoom(BOOT_ROOM_LOAD_TIMEOUT_MS);
        }
      } catch (error) {
        console.error("Boot verification failed:", error);
      } finally {
        if (active) {
          useAuthStore.getState().setAuthLoading(false);
        }
      }
    };
    bootstrap();
    return () => {
      active = false;
    };
  }, [loadSession]);

  const systemBarStyle = theme === 'dark' ? 'light' : 'dark';

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
        <SystemBars style="light" />
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SystemBars style={systemBarStyle} />
        <Slot />
        <GlobalAlert />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default RootLayout;
