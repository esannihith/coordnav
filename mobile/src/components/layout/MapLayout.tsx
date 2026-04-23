import React, { useEffect } from 'react';
import { View, BackHandler } from 'react-native';
import { MainMap } from '../map/MainMap';
import { Header } from './Header';
import { FABStack } from '../controls/FABStack';
import { MainBottomSheet } from '../sheets/MainBottomSheet';
import { useAppStore } from '../../store/useAppStore';

export function MapLayout() {
  const { uiState, setUiState, setUiStateAndTab } = useAppStore();

  useEffect(() => {
    const onBackPress = () => {
      if (uiState === 'GetDirections' || uiState === 'RouteSelection') {
        setUiStateAndTab('PlaceSearch', 'Place');
        return true;
      }
      if (uiState === 'PlaceSearch') {
        // Clear selected data when going back to Home/Search
        setUiStateAndTab('Home', 'Search', true);
        return true;
      }
      if (uiState !== 'Home') {
        setUiStateAndTab('Home', 'Search', true);
        return true; // prevent default behavior (closing the app)
      }
      return false; // let the default behavior happen
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [uiState, setUiState]);

  return (
    <View className="flex-1">
        <MainMap />
        
        {/* UI Overlay Layer */}
        <View className="absolute inset-0 pointer-events-box-none">
          <Header />
          <View className="flex-1 flex-row pointer-events-box-none">
            <View className="flex-1 pointer-events-box-none" />
            <FABStack />
          </View>
        </View>

        <MainBottomSheet />
      </View>
  );
}
