import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithCredential, 
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  FirebaseAuthTypes
} from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// Configure Google Sign-In with default options.
GoogleSignin.configure({
  webClientId: '351804853478-k54v91hh83bealbc5vjqjgiv0v0ev9se.apps.googleusercontent.com',
  offlineAccess: false,
});

export const authService = {
  /**
   * Handles Google Sign-In and Firebase authentication.
   */
  signInWithGoogle: async (): Promise<FirebaseAuthTypes.UserCredential> => {
    try {
      await GoogleSignin.hasPlayServices();
      
      try {
        await GoogleSignin.signOut();
      } catch (e) {}

      const { data } = await GoogleSignin.signIn();
      const idToken = data?.idToken;

      if (!idToken) {
        throw new Error('No ID token found from Google Sign-In');
      }

      // Modular style credential creation and sign in
      const googleCredential = GoogleAuthProvider.credential(idToken);
      return await signInWithCredential(getAuth(), googleCredential);
    } catch (error: any) {
      if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
        console.error('Google Sign-In Error:', error);
      }
      throw error;
    }
  },

  signOut: async () => {
    try {
      await GoogleSignin.signOut();
      await firebaseSignOut(getAuth());
    } catch (error) {
      console.error('Sign-Out Error:', error);
    }
  },

  /**
   * Use the modular style as recommended by v22+ warning
   */
  onAuthStateChanged: (callback: (user: FirebaseAuthTypes.User | null) => void) => {
    return onAuthStateChanged(getAuth(), callback);
  },

  getCurrentUser: () => {
    return getAuth().currentUser;
  },
};
