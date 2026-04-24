import "react-native-gesture-handler";
import "../../global.css";
import { Slot } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { authService } from "../services/authService";

function RootLayout() {
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    const subscriber = authService.onAuthStateChanged((user) => {
      setUser(user);
    });
    return subscriber; // unsubscribe on unmount
  }, [setUser]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Slot />
    </GestureHandlerRootView>
  );
}

export default RootLayout;
