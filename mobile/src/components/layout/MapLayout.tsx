import React, { useEffect } from 'react';
import { View, BackHandler, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainMap } from '../map/MainMap';
import { Header } from './Header';
import { FABStack } from '../controls/FABStack';
import { MainBottomSheet } from '../sheets/MainBottomSheet';
import { useNavigation } from '@googlemaps/react-native-navigation-sdk';
import { useAppStore } from '../../store/useAppStore';
import { stopNavigation } from '../../services/navigationService';

export function MapLayout() {
  const [isMapReady, setIsMapReady] = React.useState(false);
  const uiState = useAppStore((s) => s.uiState);
  const activeTab = useAppStore((s) => s.activeTab);
  const setUiStateAndTab = useAppStore((s) => s.setUiStateAndTab);
  const stopNav = useAppStore((s) => s.stopNav);
  const leaveRoom = useAppStore((s) => s.leaveRoom);

  const { navigationController } = useNavigation();

  useEffect(() => {
    // Small delay to allow BottomSheet to initialize before Map heavy lifting
    const timer = setTimeout(() => setIsMapReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      // ── Non-destructive transitions (instant) ──
      if (uiState === 'GetDirections' || uiState === 'RouteSelection') {
        setUiStateAndTab('PlaceSearch', 'Place');
        return true;
      }
      if (uiState === 'InRoomGetDirections') {
        setUiStateAndTab('InRoom', 'Place');
        return true;
      }
      if (uiState === 'PlaceSearch') {
        setUiStateAndTab('Home', 'Search', true);
        return true;
      }

      // ── Navigating Solo — confirm before exiting nav ──
      if (uiState === 'NavigatingSolo') {
        Alert.alert(
          'Exit Navigation?',
          'This will stop your current navigation session.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Exit',
              style: 'destructive',
              onPress: async () => {
                await stopNavigation(navigationController);
                stopNav();
              },
            },
          ]
        );
        return true; // consume event, let alert handle the rest
      }

      // ── InRoomNavigating — tab-level back, then confirm exit nav ──
      if (uiState === 'InRoomNavigating') {
        if (activeTab === 'Place') {
          setUiStateAndTab('InRoomNavigating', 'Search', true);
          return true;
        }
        // At base tab → confirm exit navigation (back to room)
        Alert.alert(
          'Exit Navigation?',
          'This will stop your current navigation and return to the room.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Exit',
              style: 'destructive',
              onPress: async () => {
                await stopNavigation(navigationController);
                useAppStore.setState({
                  isNavSessionActive: false,
                  destination: null,
                  routes: [],
                  selectedRouteId: null,
                  selectedPlace: null,
                  searchQuery: '',
                  searchResults: [],
                  uiState: 'InRoom',
                  activeTab: 'Room',
                });
              },
            },
          ]
        );
        return true;
      }

      // ── InRoom — tab-level back, then confirm leave room ──
      if (uiState === 'InRoom') {
        if (activeTab === 'Place') {
          setUiStateAndTab('InRoom', 'Search', true);
          return true;
        }
        if (activeTab === 'Search') {
          setUiStateAndTab('InRoom', 'Room');
          return true;
        }
        if (activeTab === 'Chat') {
          setUiStateAndTab('InRoom', 'Room');
          return true;
        }
        // At base tab (Room) → confirm leave room
        Alert.alert(
          'Leave Room?',
          'Are you sure you want to leave this room?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Leave',
              style: 'destructive',
              onPress: () => leaveRoom(),
            },
          ]
        );
        return true;
      }

      // ── Default ──
      if (uiState !== 'Home') {
        setUiStateAndTab('Home', 'Search', true);
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [uiState, activeTab, setUiStateAndTab, stopNav, leaveRoom, navigationController]);

  const isNavigating = uiState === 'NavigatingSolo' || uiState === 'InRoomNavigating';

  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1">
      {isMapReady && <MainMap />}

      {/* UI Overlay Layer */}
      <View className="absolute inset-0 pointer-events-box-none">
        {/* SDK header renders natively on the NavigationView when nav is active */}
        {!isNavigating && <Header />}

        <View
          className="absolute right-4 pointer-events-none"
          style={{ top: insets.top + (isNavigating ? 160 : 100) }}
        >
          <FABStack />
        </View>
      </View>

      <MainBottomSheet />
    </View>
  );
}
