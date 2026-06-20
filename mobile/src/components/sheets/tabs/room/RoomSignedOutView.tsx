import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Lock } from "lucide-react-native";
import { statusCodes } from "@react-native-google-signin/google-signin";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/auth.service";
import { useAlertStore } from "@/store/alert.store";

export function RoomSignedOutView() {
  const setSession = useAuthStore((s) => s.setSession);
  const showAlert = useAlertStore((s) => s.showAlert);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const session = await authService.signInWithGoogle();
      await setSession(session);
    } catch (error: any) {
      if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
        console.error("Google Sign-In Failure:", error);
        const errMsg =
          error?.message ||
          (typeof error === "object" ? JSON.stringify(error) : String(error));
        showAlert(
          "Sign-In Failed",
          `Could not complete Google Sign-In. Details: ${errMsg}`,
        );
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <View className="flex-1 px-4 pt-10 items-center">
      <View className="w-16 h-16 rounded-2xl bg-secondary border border-border items-center justify-center mb-5">
        <Lock color="#f59e0b" size={26} />
      </View>

      <Text className="text-foreground text-lg font-bold mb-2 text-center">
        Rooms require sign in
      </Text>
      <Text className="text-muted text-sm text-center leading-5 mb-7 max-w-[260px]">
        Create or join a room to share your live location with a group.
      </Text>

      <TouchableOpacity
        disabled={isSigningIn}
        className="bg-primary py-3.5 rounded-2xl items-center justify-center w-full flex-row"
        onPress={handleGoogleSignIn}
        style={{ opacity: isSigningIn ? 0.7 : 1 }}
      >
        {isSigningIn ? (
          <ActivityIndicator color="#ffffff" size="small" className="mr-2" />
        ) : null}
        <Text className="text-white font-semibold text-base">
          {isSigningIn ? "Connecting…" : "Sign in with Google"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
