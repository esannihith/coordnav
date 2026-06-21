// src/app/(app)/_layout.tsx
import { Stack } from 'expo-router';
import { NavigationProvider, TaskRemovedBehavior } from '@googlemaps/react-native-navigation-sdk';

export default function AppLayout() {
  return (
    <NavigationProvider
      termsAndConditionsDialogOptions={{
        title: 'TripRoom Terms',
        companyName: 'TripRoom',
        showOnlyDisclaimer: true,
      }}
      taskRemovedBehavior={TaskRemovedBehavior.QUIT_SERVICE}
    >
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="home" />
        <Stack.Screen name="profile" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="search" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
    </NavigationProvider>
  );
}
