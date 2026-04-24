import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { MapLayout } from "../../components/layout/MapLayout";
import { useAppStore, UIState } from "../../store/useAppStore";
import { Wrench } from "lucide-react-native";
import { NavigationProvider, TaskRemovedBehavior } from '@googlemaps/react-native-navigation-sdk';

function DevMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { uiState, setUiState } = useAppStore();
  const states: UIState[] = [
    'Home', 'PlaceSearch', 'GetDirections', 'RouteSelection', 
    'NavigatingSolo', 'InRoom', 'InRoomNavigating', 'InRoomGetDirections'
  ];

  if (!isOpen) {
    return (
      <TouchableOpacity 
        onPress={() => setIsOpen(true)}
        className="absolute top-32 left-4 w-10 h-10 bg-black/80 rounded-full items-center justify-center border border-border z-50 pointer-events-auto"
      >
        <Wrench color="#3b82f6" size={20} />
      </TouchableOpacity>
    );
  }

  return (
    <View className="absolute top-32 left-4 bg-black/90 p-4 rounded-xl border border-border z-50 shadow-lg pointer-events-auto w-64 max-h-96">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-white font-bold">Dev Menu: State</Text>
        <TouchableOpacity onPress={() => setIsOpen(false)}>
          <Text className="text-red-400">Close</Text>
        </TouchableOpacity>
      </View>
      <ScrollView>
        {states.map((s) => (
          <TouchableOpacity 
            key={s} 
            onPress={() => { setUiState(s); setIsOpen(false); }}
            className={`py-2 px-3 rounded-lg mb-2 ${uiState === s ? 'bg-primary' : 'bg-secondary'}`}
          >
            <Text className="text-white">{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const safeTaskRemovedBehavior =
  (TaskRemovedBehavior as unknown as { QUIT_SERVICE?: TaskRemovedBehavior }).QUIT_SERVICE ??
  TaskRemovedBehavior.CONTINUE_SERVICE;

export default function App() {
  return (
    <NavigationProvider
      termsAndConditionsDialogOptions={{
        title: 'TripRoom Terms',
        companyName: 'TripRoom',
        showOnlyDisclaimer: true,
      }}
      // Avoid stale guidance/session artifacts after app task is removed.
      taskRemovedBehavior={safeTaskRemovedBehavior}
    >
      <View className="flex-1 bg-black">
        <MapLayout />
        {/* <DevMenu /> */}
      </View>
    </NavigationProvider>
  );
}
