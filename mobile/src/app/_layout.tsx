import "react-native-gesture-handler";
import "../../global.css";
import { Slot } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/auth.store";
import { useUpdates } from "@/hooks/useUpdates";
import { ToastHost } from "@/components/feedback/ToastHost";

function RootLayout() {
  useUpdates();
  const loadSession = useAuthStore((state) => state.loadSession);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Slot />
        <ToastHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default RootLayout;
