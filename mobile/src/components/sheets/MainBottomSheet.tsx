import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Keyboard } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useAppStore, BottomSheetTab } from '../../store/useAppStore';
import { cn } from '../../lib/utils';

// Tabs
import { RoomTab } from './tabs/RoomTab';
import { SearchTab } from './tabs/SearchTab';
import { ChatTab } from './tabs/ChatTab';
import { PeopleTab } from './tabs/PeopleTab';
import { DirectionsTab } from './tabs/DirectionsTab';
import { PlaceTab } from './tabs/PlaceTab';

export function MainBottomSheet() {
  const { uiState, activeTab, setActiveTab, selectedPlace } = useAppStore();
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Derive available tabs and snap points based on state
  const availableTabs: BottomSheetTab[] = useMemo(() => {
    switch (uiState) {
      case 'Home': return ['Room', 'Search'];
      case 'PlaceSearch': return selectedPlace ? ['Room', 'Place'] : ['Room', 'Search'];
      case 'GetDirections':
      case 'RouteSelection': return ['Directions']; // No tabs shown because length is 1
      case 'NavigatingSolo': return []; // No tabs, just footer
      case 'InRoom': return ['Chat', 'People', 'Search'];
      case 'InRoomNavigating': return ['Chat', 'People', 'Search'];
      default: return ['Room'];
    }
  }, [uiState, selectedPlace]);

  const snapPoints = useMemo(() => {
    switch (uiState) {
      case 'Home': return ['10%', '45%', '90%'];
      case 'PlaceSearch': return ['10%', '45%', '90%'];
      case 'GetDirections':
      case 'RouteSelection': return ['10%', '40%'];
      case 'NavigatingSolo': return ['10%'];
      case 'InRoom': return ['10%', '40%', '90%'];
      case 'InRoomNavigating': return ['10%', '40%', '90%'];
      default: return ['45%'];
    }
  }, [uiState]);

  useEffect(() => {
    // When state changes, snap to appropriate point automatically
    if (uiState === 'NavigatingSolo') bottomSheetRef.current?.snapToIndex(0); // 10%
    else if (uiState === 'Home') bottomSheetRef.current?.snapToIndex(1); // 45%
    else if (uiState === 'PlaceSearch') bottomSheetRef.current?.snapToIndex(1); // 45%
    else if (uiState === 'InRoom') bottomSheetRef.current?.snapToIndex(1); // 40%
    else if (uiState === 'GetDirections') bottomSheetRef.current?.snapToIndex(1); // 40%
    
    // Auto-select first tab if active is no longer valid
    if (!availableTabs.includes(activeTab) && availableTabs.length > 0) {
      setActiveTab(availableTabs[0]);
    }
  }, [uiState, availableTabs, activeTab, setActiveTab]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      index={1}
      backgroundStyle={{ backgroundColor: '#1c1c1e', borderRadius: 24 }} // secondary color
      handleIndicatorStyle={{ backgroundColor: '#38383a', width: 40 }} // border color
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustPan"
      enablePanDownToClose={false}
    >
      <BottomSheetView style={styles.container}>
        {availableTabs.length > 1 && (
          <View className="flex-row mx-4 mb-2 bg-[#000] rounded-xl p-1">
            {availableTabs.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 items-center justify-center py-2 rounded-lg",
                    isActive ? "bg-secondary" : "bg-transparent"
                  )}
                >
                  <Text className={cn(
                    "font-medium",
                    isActive ? "text-foreground" : "text-muted"
                  )}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View className="flex-1">
          {activeTab === 'Room' && <RoomTab />}
          {activeTab === 'Search' && <SearchTab />}
          {activeTab === 'Place' && <PlaceTab />}
          {activeTab === 'Chat' && <ChatTab />}
          {activeTab === 'People' && <PeopleTab />}
          {activeTab === 'Directions' && <DirectionsTab />}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
