import React, { useEffect } from 'react';
import { View, StyleSheet, ToastAndroid } from 'react-native';
import { NavigationView, NavigationNightMode } from '@googlemaps/react-native-navigation-sdk';
import { useAppStore } from '../../store/useAppStore';

export function MainMap() {
  const { uiState } = useAppStore();

  useEffect(() => {
    // If state is Navigating, show a toast instead of actual navigation since it is deferred
    if (uiState === 'NavigatingSolo' || uiState === 'InRoomNavigating') {
      ToastAndroid.show('Start Navigation: Deferred (TODO)', ToastAndroid.SHORT);
    }
  }, [uiState]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <NavigationView
        style={StyleSheet.absoluteFill}
        navigationNightMode={NavigationNightMode.FORCE_NIGHT}
        compassEnabled={false} 
        myLocationButtonEnabled={false} 
        zoomControlsEnabled={false}
        headerEnabled={false}
        footerEnabled={false}
      />
    </View>
  );
}
