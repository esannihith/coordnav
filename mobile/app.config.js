export default {
  expo: {
    owner: "sannihith04",
    name: "coordnav",
    slug: "coordnav",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "coordnav",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    android: {
      package: "com.coordnav.app",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },

      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY
        }
      },
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION",
        "VIBRATE"
      ],

      predictiveBackGestureEnabled: false,
    },


    plugins: [
      "expo-router",
      "expo-dev-client",

      [
        "expo-splash-screen",
        {
          backgroundColor: "#208AEF",
          android: {
            image: "./assets/images/splash-icon.png",
            imageWidth: 76
          }
        }
      ],
      [
        "expo-build-properties",
        {
          android: {
            minSdkVersion: 24,
            enableJetifier: true,
          }
        }
      ],
      "./plugins/withAndroidDesugaring",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "CoordNav uses your location to show your group where you are.",
          locationAlwaysPermission: "CoordNav uses background location so your group can see you while you drive."
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#4a9eed"
        }
      ],
      "expo-system-ui",
      "expo-secure-store",
        
      "@react-native-google-signin/google-signin"
    ],
    "extra": {
      "eas": {
        "projectId": "4ac0e924-3e95-45db-be0b-c8dd70524ada"
      }
    },
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    }
  },
};