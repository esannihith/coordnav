import React, { useEffect } from 'react';
import { View, BackHandler, Alert, AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainMap } from '../map/MainMap';
import { Header } from './Header';
import { FABStack } from '../controls/FABStack';
import { MainBottomSheet } from '../sheets/MainBottomSheet';
import { useNavigation } from '@googlemaps/react-native-navigation-sdk';
import { useAppStore } from '../../store/useAppStore';
import { useRoomStore } from '../../store/useRoomStore';
import {
  isNativeGuidanceRunning,
  resetNativeNavigationSession,
  stopNavigation,
} from '../../services/navigationService';

export function MapLayout() {
  const [isMapReady, setIsMapReady] = React.useState(false);
  const didRunStartupCleanupRef = React.useRef(false);

  const uiState = useAppStore((s) => s.uiState);
  const activeTab = useAppStore((s) => s.activeTab);
  const isNavSessionActive = useAppStore((s) => s.isNavSessionActive);
  const setUiStateAndTab = useAppStore((s) => s.setUiStateAndTab);
  const endNavSession = useAppStore((s) => s.endNavSession);

  const isInRoom = useRoomStore((s) => s.isInRoom);
  const leaveRoom = useRoomStore((s) => s.leaveRoom);

  const { navigationController } = useNavigation();

  useEffect(() => {
    const timer = setTimeout(() => setIsMapReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (didRunStartupCleanupRef.current) {
      return;
    }

    didRunStartupCleanupRef.current = true;
    let cancelled = false;

    // Defensive startup reset: clear lingering native guidance and reconcile JS UI/session state.
    const bootstrapCleanup = async () => {
      await resetNativeNavigationSession(navigationController);
      if (cancelled) return;
      const appState = useAppStore.getState();
      const navLikeUi = appState.uiState === 'NavigatingSolo' || appState.uiState === 'InRoomNavigating';

      if (appState.isNavSessionActive || navLikeUi) {
        const target = useRoomStore.getState().isInRoom ? 'InRoom' : 'Home';
        endNavSession(target);
      }
    };

    void bootstrapCleanup();

    return () => {
      cancelled = true;
    };
  }, [navigationController, endNavSession]);

  useEffect(() => {
    let cancelled = false;

    const reconcileOnActive = async () => {
      const appState = useAppStore.getState();
      const navLikeUi = appState.uiState === 'NavigatingSolo' || appState.uiState === 'InRoomNavigating';

      if (!appState.isNavSessionActive && !navLikeUi) {
        return;
      }

      const guidanceActive = await isNativeGuidanceRunning(navigationController);
      if (cancelled || guidanceActive) {
        return;
      }

      const target = useRoomStore.getState().isInRoom ? 'InRoom' : 'Home';
      endNavSession(target);
    };

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void reconcileOnActive();
      }
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [navigationController, endNavSession]);

  useEffect(() => {
    const inRoomState = uiState === 'InRoom' || uiState === 'InRoomNavigating' || uiState === 'InRoomGetDirections';
    const navState = uiState === 'NavigatingSolo' || uiState === 'InRoomNavigating';

    // Keep room/UI state aligned with room store state.
    if (inRoomState && !isInRoom) {
      setUiStateAndTab('Home', 'Search', true);
      return;
    }

    if (!inRoomState && isInRoom) {
      setUiStateAndTab('InRoom', 'Room');
      return;
    }

    // Keep nav UI state aligned with local nav session state.
    if (navState && !isNavSessionActive) {
      endNavSession(isInRoom ? 'InRoom' : 'Home');
    }
  }, [uiState, isInRoom, isNavSessionActive, setUiStateAndTab, endNavSession]);

  useEffect(() => {
    const onBackPress = () => {
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

      if (uiState === 'NavigatingSolo') {
        Alert.alert('Exit Navigation?', 'This will stop your current navigation session.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Exit',
            style: 'destructive',
            onPress: async () => {
              await stopNavigation(navigationController);
              endNavSession('Home');
            },
          },
        ]);
        return true;
      }

      if (uiState === 'InRoomNavigating') {
        if (activeTab === 'Place') {
          setUiStateAndTab('InRoomNavigating', 'Search', true);
          return true;
        }

        Alert.alert('Exit Navigation?', 'This will stop your current navigation and return to the room.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Exit',
            style: 'destructive',
            onPress: async () => {
              await stopNavigation(navigationController);
              endNavSession('InRoom');
            },
          },
        ]);
        return true;
      }

      if (uiState === 'InRoom') {
        if (activeTab === 'Place') {
          setUiStateAndTab('InRoom', 'Search', true);
          return true;
        }

        if (activeTab === 'Search' || activeTab === 'Chat') {
          setUiStateAndTab('InRoom', 'Room');
          return true;
        }

        Alert.alert('Leave Room?', 'Are you sure you want to leave this room?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: () => {
              void leaveRoom();
            },
          },
        ]);
        return true;
      }

      if (uiState !== 'Home') {
        setUiStateAndTab('Home', 'Search', true);
        return true;
      }

      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [uiState, activeTab, setUiStateAndTab, leaveRoom, navigationController, endNavSession]);

  const isNavigating = uiState === 'NavigatingSolo' || uiState === 'InRoomNavigating';
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1">
      {isMapReady && <MainMap />}

      <View className="absolute inset-0 pointer-events-box-none">
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
