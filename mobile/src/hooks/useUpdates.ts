import * as Updates from 'expo-updates';
import { useEffect } from 'react';

/**
 * Hook to handle silent background updates.
 * The native configuration in app.config.js (checkAutomatically: "ON_LOAD")
 * handles the splash-screen-blocking update check.
 * This hook can be used to check for updates that might have been published
 * while the app was already running.
 */
export function useUpdates() {
  useEffect(() => {
    if (__DEV__) return;

    async function onFetchUpdateAsync() {
      try {
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          // Fetch the update in the background
          await Updates.fetchUpdateAsync();
          // We don't alert the user. The update will be applied on next cold start.
          // Alternatively, you could use a subtle toast to say "Update ready, restart to apply".
        }
      } catch (error) {
        console.error(`Error fetching latest Expo update: ${error}`);
      }
    }

    // Check for updates every time the app comes to foreground or just once on mount
    onFetchUpdateAsync();
  }, []);
}
