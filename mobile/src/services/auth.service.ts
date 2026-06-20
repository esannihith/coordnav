import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { Session, Tokens } from "@/types/user.types";
import { baseApiClient } from "@/services/http";

// Configure Google Sign-In with default options.
GoogleSignin.configure({
  webClientId:
    "351804853478-k54v91hh83bealbc5vjqjgiv0v0ev9se.apps.googleusercontent.com",
  offlineAccess: false,
});

export const authService = {
  signInWithGoogle: async (): Promise<Session> => {
    try {
      await GoogleSignin.hasPlayServices();

      try {
        await GoogleSignin.signOut();
      } catch (e) {} // ignore sign out error

      const { data } = await GoogleSignin.signIn();
      const idToken = data?.idToken;

      if (!idToken) {
        throw new Error("No ID token found from Google Sign-In");
      }

      const response = await baseApiClient.post("/auth/google-signin", {
        idToken: idToken,
      });
      const { user, accessToken, refreshToken } = response.data.data;
      return { user, tokens: { accessToken, refreshToken } };
    } catch (error: any) {
      if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
        console.error("Google Sign-In Error:", error);
      }
      throw error;
    }
  },

  signOut: async (refreshToken: string): Promise<void> => {
    try {
      await GoogleSignin.signOut();
      await baseApiClient.post("/auth/signout", { refreshToken: refreshToken });
    } catch (error) {
      console.error("Sign-Out Error:", error);
      throw error;
    }
  },

  refresh: async (refreshToken: string): Promise<Tokens> => {
    try {
      const response = await baseApiClient.post("/auth/refresh", {
        refreshToken: refreshToken,
      });
      return response.data.data;
    } catch (error) {
      console.error("Refresh Error:", error);
      throw error;
    }
  },
};
