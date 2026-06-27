// src/components/layout/MapLayout.tsx
import React, { useEffect } from 'react';
import { View, BackHandler, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { MainMap } from '../map/MainMap';
import { SearchBar } from './SearchBar';
import { MainBottomSheet } from '../sheets/MainBottomSheet';
import { useNavigation } from '@googlemaps/react-native-navigation-sdk';
import { useAppStore, useRoomStore, useAlertStore, useMapStore, useChatStore } from '../../store';
import { initNavSession } from '../../services';
import * as Location from 'expo-location';

export function MapLayout() {
  const [isNativeMapReady, setIsNativeMapReady] = React.useState(false);
  const didRunInitRef = React.useRef(false);
  const isInitializingRef = React.useRef(false);

  const uiState = useAppStore((s) => s.uiState);
  const setUiState = useAppStore((s) => s.setUiState);
  const room = useRoomStore((s) => s.room);
  const isInRoom = room !== null;
  const leaveRoom = useRoomStore((s) => s.leaveRoom);
  const messages = useChatStore((s) => s.messages);

  const router = useRouter();

  const { navigationController } = useNavigation();

  // Initialize SDK immediately after native map has rendered and permission is granted
  useEffect(() => {
    if (didRunInitRef.current || isInitializingRef.current || !isNativeMapReady) {
      return;
    }

    const bootstrap = async () => {
      isInitializingRef.current = true;
      try {
        console.log('[MapLayout] Requesting location permissions...');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('[MapLayout] Location permission not granted, init aborted');
          return;
        }

        const success = await initNavSession(navigationController);
        if (success) {
          didRunInitRef.current = true;
        }
      } catch (error) {
        console.error('[MapLayout] Bootstrap failed:', error);
      } finally {
        isInitializingRef.current = false;
      }
    };

    void bootstrap();
  }, [navigationController, isNativeMapReady]);

  // Sync effect: UI state mirrors Room membership
  useEffect(() => {
    if (isInRoom && uiState !== 'InRoom') {
      setUiState('InRoom');
    } else if (!isInRoom && uiState === 'InRoom') {
      setUiState('Home');
    }
  }, [isInRoom, uiState, setUiState]);

  // Hardware back press handler
  useEffect(() => {
    const onBackPress = () => {
      // Dismiss a place preview overlay first (slides back down to the map).
      if (useMapStore.getState().state.kind === 'PREVIEW_PLACE') {
        useMapStore.getState().clear();
        return true;
      }

      if (uiState === 'CreateRoom') {
        setUiState('Home');
        return true;
      }

      if (uiState === 'InRoom') {
        useAlertStore.getState().showAlert('Leave Room?', 'Are you sure you want to leave this room?', [
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

      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [uiState, leaveRoom, setUiState]);

  return (
    <View className="flex-1">
      <MainMap onMapReady={() => setIsNativeMapReady(true)} />

      <View className="absolute inset-0 pointer-events-box-none">
        <SearchBar />
      </View>

      <MainBottomSheet />

      {/* Chat FAB — only visible when in a room */}
      {isInRoom && (
        <Pressable
          onPress={() => router.push('/chat')}
          style={{
            position: 'absolute',
            bottom: 180,
            right: 20,
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: '#3b82f6',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <MessageCircle size={22} color="#ffffff" />
          {/* Unread badge */}
          {messages.length > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: '#ef4444',
                borderWidth: 1.5,
                borderColor: '#121212',
              }}
            />
          )}
        </Pressable>
      )}
    </View>
  );
}
