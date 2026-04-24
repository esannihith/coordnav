import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useAppStore, BottomSheetTab } from '../../store/useAppStore';
import { cn } from '../../lib/utils';

// Tabs
import { RoomTab } from './tabs/RoomTab';
import { SearchTab } from './tabs/SearchTab';
import { ChatTab } from './tabs/ChatTab';
import { DirectionsTab } from './tabs/DirectionsTab';
import { PlaceTab } from './tabs/PlaceTab';
import { NavTab } from './tabs/NavTab';

// ── Tab & snap config driven by uiState ──
const TAB_CONFIG: Record<string, { tabs: BottomSheetTab[], tabsWithPlace: BottomSheetTab[], snap: string[], defaultIndex: number }> = {
  Home: { tabs: ['Room', 'Search'], tabsWithPlace: ['Room', 'Search'], snap: ['10%', '45%', '85%'], defaultIndex: 1 },
  PlaceSearch: { tabs: ['Room', 'Search'], tabsWithPlace: ['Room', 'Place'], snap: ['10%', '45%', '85%'], defaultIndex: 1 },
  GetDirections: { tabs: ['Directions'], tabsWithPlace: ['Directions'], snap: ['10%', '40%'], defaultIndex: 1 },
  RouteSelection: { tabs: ['Directions'], tabsWithPlace: ['Directions'], snap: ['10%', '40%'], defaultIndex: 1 },
  InRoomGetDirections: { tabs: ['Room', 'Chat', 'Directions'], tabsWithPlace: ['Room', 'Chat', 'Directions'], snap: ['15%', '40%', '85%'], defaultIndex: 1 },
  NavigatingSolo: { tabs: ['Nav', 'Search'], tabsWithPlace: ['Nav', 'Place'], snap: ['15%', '45%', '75%'], defaultIndex: 0 },
  InRoom: { tabs: ['Room', 'Chat', 'Search'], tabsWithPlace: ['Room', 'Chat', 'Place'], snap: ['10%', '40%', '85%'], defaultIndex: 1 },
  InRoomNavigating: { tabs: ['Nav', 'Room', 'Chat', 'Search'], tabsWithPlace: ['Nav', 'Room', 'Chat', 'Place'], snap: ['15%', '40%', '75%'], defaultIndex: 0 },
};

const DEFAULT_CONFIG = { tabs: ['Room'] as BottomSheetTab[], tabsWithPlace: ['Room'] as BottomSheetTab[], snap: ['45%'], defaultIndex: 0 };

// ── Tab content renderer (avoids inline conditionals in JSX) ──
const TAB_COMPONENTS: Record<BottomSheetTab, React.ComponentType> = {
  Room: RoomTab,
  Search: SearchTab,
  Place: PlaceTab,
  Chat: ChatTab,
  Directions: DirectionsTab,
  Nav: NavTab,
};

export function MainBottomSheet() {
  const uiState = useAppStore((s) => s.uiState);
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const selectedPlace = useAppStore((s) => s.selectedPlace);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const config = TAB_CONFIG[uiState] || DEFAULT_CONFIG;

  const availableTabs = useMemo(
    () => selectedPlace ? config.tabsWithPlace : config.tabs,
    [config, selectedPlace]
  );

  const snapPoints = config.snap;

  // ── Snap to default index only when uiState changes ──
  useEffect(() => {
    bottomSheetRef.current?.snapToIndex(config.defaultIndex);
  }, [uiState]);

  // ── Auto-select first tab if active tab is no longer valid ──
  useEffect(() => {
    if (!availableTabs.includes(activeTab) && availableTabs.length > 0) {
      setActiveTab(availableTabs[0]);
    }
  }, [availableTabs, activeTab, setActiveTab]);

  const ActiveTabComponent = TAB_COMPONENTS[activeTab];

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      index={config.defaultIndex}
      backgroundStyle={{ backgroundColor: '#1c1c1e', borderRadius: 24 }}
      handleIndicatorStyle={{ backgroundColor: '#38383a', width: 40 }}
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
          {ActiveTabComponent && <ActiveTabComponent />}
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
