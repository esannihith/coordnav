import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Navigation, Star, Users } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useAppStore } from '../../../store/useAppStore';

export function PlaceTab() {
  const { selectedPlace, setUiState, setActiveTab } = useAppStore();

  const handleDirections = async () => {
    try {
      await Location.enableNetworkProviderAsync();
      setUiState('GetDirections');
      setActiveTab('Directions');
    } catch (e) {
      Alert.alert('Location required', 'Please enable location services to get directions.');
    }
  };

  if (!selectedPlace) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-muted">No place selected</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 p-4">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <Text className="text-2xl font-bold text-foreground mb-1">
            {selectedPlace.displayName.text}
          </Text>
          <Text className="text-sm text-muted mb-2">
            {selectedPlace.formattedAddress}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center mb-6">
        <Star color="#eab308" size={16} fill="#eab308" />
        <Text className="text-foreground ml-1 font-medium">{selectedPlace.rating}</Text>
        <Text className="text-muted ml-1">({selectedPlace.userRatingCount.toLocaleString()})</Text>
        
        <View className="w-1 h-1 bg-border rounded-full mx-2" />
        
        <Text className="text-muted capitalize">
          {selectedPlace.types[0].replace('_', ' ')}
        </Text>
      </View>

      <View className="flex-row gap-4 mb-6">
        <TouchableOpacity 
          className="flex-1 bg-primary py-3 rounded-xl flex-row items-center justify-center"
          onPress={() => {
            setUiState('GetDirections');
            setActiveTab('Directions');
          }}
        >
          <Navigation color="#fff" size={20} className="mr-2" />
          <Text className="text-primary-foreground font-semibold">Directions</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="flex-1 bg-secondary py-3 rounded-xl flex-row items-center justify-center"
          onPress={() => {
            // Future: Implement create room flow with this place as destination
            setUiState('Home');
            setActiveTab('Room');
          }}
        >
          <Users color="#fff" size={20} className="mr-2" />
          <Text className="text-foreground font-semibold">Create Room</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
