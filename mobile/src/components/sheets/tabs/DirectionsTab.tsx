import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Navigation } from 'lucide-react-native';
import { useAppStore } from '../../../store/useAppStore';

export function DirectionsTab() {
  const { setUiState, uiState } = useAppStore();

  const handleStartNav = () => {
    if (uiState === 'InRoom') {
      setUiState('InRoomNavigating');
    } else {
      setUiState('NavigatingSolo');
    }
  };

  return (
    <View className="flex-1 px-4 pt-4">
      <View className="bg-secondary rounded-xl p-4 mb-4 border border-border">
        <View className="flex-row items-center mb-3">
          <View className="w-2 h-2 rounded-full bg-primary mr-3" />
          <Text className="text-foreground text-base">My Location</Text>
        </View>
        <View className="h-4 border-l border-border ml-1 mb-3" />
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-red-500 mr-3" />
          <Text className="text-foreground text-base font-semibold">Central Park</Text>
        </View>
      </View>

      <Text className="text-muted text-sm mb-3 font-medium uppercase tracking-wider">Routes</Text>
      
      <TouchableOpacity 
        className="flex-row items-center p-4 bg-primary/10 border border-primary/30 rounded-xl mb-3"
      >
        <View className="flex-1">
          <Text className="text-primary font-bold text-xl mb-1">15 min</Text>
          <Text className="text-muted text-sm">Fastest route via I-95</Text>
        </View>
        <Text className="text-foreground font-semibold">5.2 mi</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        className="flex-row items-center p-4 bg-secondary rounded-xl"
      >
        <View className="flex-1">
          <Text className="text-foreground font-bold text-xl mb-1">18 min</Text>
          <Text className="text-muted text-sm">Similar ETA via US-1</Text>
        </View>
        <Text className="text-foreground font-semibold">4.8 mi</Text>
      </TouchableOpacity>

      <View className="flex-1 justify-end pb-6">
        <TouchableOpacity 
          onPress={handleStartNav}
          className="bg-primary py-4 rounded-xl items-center flex-row justify-center shadow-lg shadow-primary/30"
        >
          <Navigation color="#fff" size={20} className="mr-2" />
          <Text className="text-white font-bold text-lg">Start Navigation</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
