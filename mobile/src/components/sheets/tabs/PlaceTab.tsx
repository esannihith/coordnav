import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Navigation, Star, Users, MapPinPlus, Share2 } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useAppStore } from '../../../store/useAppStore';
import { useRoomStore } from '../../../store/useRoomStore';

export function PlaceTab() {
  const { selectedPlace, setUiState, setActiveTab, uiState, setUiStateAndTab } = useAppStore();
  const isInRoomSession = useRoomStore((s) => s.isInRoom);

  const isNavigating = uiState === 'NavigatingSolo' || uiState === 'InRoomNavigating';
  const isInRoom = uiState === 'InRoom' || uiState === 'InRoomNavigating' || uiState === 'InRoomGetDirections';

  const handleDirections = async () => {
    try {
      await Location.enableNetworkProviderAsync();
      if (isInRoomSession) {
        setUiState('InRoomGetDirections');
      } else {
        setUiState('GetDirections');
      }
      setActiveTab('Directions');
    } catch (e) {
      Alert.alert('Location required', 'Please enable location services to get directions.');
    }
  };

  const handleCreateRoom = () => {
    if (isNavigating) {
      Alert.alert(
        'Exit navigation?',
        'Creating a room will end your current navigation session.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Exit & Create',
            style: 'destructive',
            onPress: () => setUiStateAndTab('Home', 'Room', true),
          },
        ]
      );
    } else {
      setUiState('Home');
      setActiveTab('Room');
    }
  };

  const renderActions = () => {
    // ── Primary action ──
    const primaryButton = isNavigating ? (
      <TouchableOpacity
        className="flex-1 bg-green-600 py-3 rounded-xl flex-row items-center justify-center"
        onPress={() => Alert.alert('Todo', 'Add stop functionality coming soon')}
      >
        <MapPinPlus color="#fff" size={20} className="mr-2" />
        <Text className="text-white font-semibold">Add Stop</Text>
      </TouchableOpacity>
    ) : (
      <TouchableOpacity
        className="flex-1 bg-primary py-3 rounded-xl flex-row items-center justify-center"
        onPress={handleDirections}
      >
        <Navigation color="#fff" size={20} className="mr-2" />
        <Text className="text-primary-foreground font-semibold">Directions</Text>
      </TouchableOpacity>
    );

    // ── Secondary action (context-dependent) ──
    let secondaryButton = null;

    if (isInRoom) {
      // In any room state → Share to Chat
      secondaryButton = (
        <TouchableOpacity
          className="flex-1 bg-secondary py-3 rounded-xl flex-row items-center justify-center"
          onPress={() => Alert.alert('Todo', 'Share to Chat coming soon')}
        >
          <Share2 color="#fff" size={20} className="mr-2" />
          <Text className="text-foreground font-semibold">Share to Chat</Text>
        </TouchableOpacity>
      );
    } else if (!isNavigating) {
      // Solo, not navigating → Create Room
      secondaryButton = (
        <TouchableOpacity
          className="flex-1 bg-secondary py-3 rounded-xl flex-row items-center justify-center"
          onPress={handleCreateRoom}
        >
          <Users color="#fff" size={20} className="mr-2" />
          <Text className="text-foreground font-semibold">Create Room</Text>
        </TouchableOpacity>
      );
    }
    // Solo + navigating → no secondary button (avoid accidental nav exit)

    return (
      <View className="flex-row gap-4 mb-6">
        {primaryButton}
        {secondaryButton}
      </View>
    );
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

      {renderActions()}
    </ScrollView>
  );
}
