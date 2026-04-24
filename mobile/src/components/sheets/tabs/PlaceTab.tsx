import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Navigation, Star, Users, MapPinPlus, Share2, MapPin } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useAppStore } from '../../../store/useAppStore';
import { useRoomStore } from '../../../store/useRoomStore';
import { AutocompletePrediction, getPlaceDetails } from '../../../services/places';

export function PlaceTab() {
  const {
    selectedPlace,
    searchResults,
    setSelectedPlace,
    setUiState,
    setActiveTab,
    uiState,
    setUiStateAndTab,
  } = useAppStore();
  const isInRoomSession = useRoomStore((s) => s.isInRoom);
  const sharePlaceToChat = useRoomStore((s) => s.sharePlaceToChat);
  const [loadingPlaceId, setLoadingPlaceId] = useState<string | null>(null);

  const isNavigating = uiState === 'NavigatingSolo' || uiState === 'InRoomNavigating';
  const isInRoom = uiState === 'InRoom' || uiState === 'InRoomNavigating' || uiState === 'InRoomGetDirections';

  const restaurantResults = useMemo(
    () =>
      (searchResults as AutocompletePrediction[])
        .filter((item) => Boolean(item?.place_id) && item.source === 'restaurant')
        .slice(0, 20),
    [searchResults]
  );

  const showRestaurantList = restaurantResults.length > 0;

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

  const handleSelectRestaurant = async (prediction: AutocompletePrediction) => {
    if (!prediction.place_id || loadingPlaceId) {
      return;
    }

    try {
      setLoadingPlaceId(prediction.place_id);
      const details = await getPlaceDetails(prediction.place_id);
      if (!details) {
        Alert.alert('Could not load place details.');
        return;
      }
      setSelectedPlace(details);
    } finally {
      setLoadingPlaceId(null);
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
          onPress={() => {
            if (!selectedPlace) {
              return;
            }

            void (async () => {
              const shared = await sharePlaceToChat(selectedPlace);
              if (shared) {
                setActiveTab('Chat');
              }
            })();
          }}
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

  if (!selectedPlace && !showRestaurantList) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-muted">No place selected</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 p-4">
      {showRestaurantList && (
        <View className="mb-5">
          <Text className="text-muted text-xs font-bold uppercase tracking-wider mb-2">
            Restaurant Results ({restaurantResults.length})
          </Text>

          <View className="bg-secondary/30 rounded-xl border border-border overflow-hidden">
            {restaurantResults.map((item) => {
              const isSelected = selectedPlace?.id === item.place_id;
              const isLoading = loadingPlaceId === item.place_id;
              return (
                <TouchableOpacity
                  key={item.place_id}
                  onPress={() => {
                    void handleSelectRestaurant(item);
                  }}
                  className={`px-3 py-3 border-b border-border/60 ${
                    isSelected ? 'bg-primary/15' : 'bg-transparent'
                  }`}
                >
                  <View className="flex-row items-center">
                    <View className="w-8 h-8 rounded-full bg-secondary items-center justify-center mr-3">
                      <MapPin size={15} color={isSelected ? '#60a5fa' : '#8e8e93'} />
                    </View>
                    <View className="flex-1 mr-2">
                      <Text className="text-foreground font-semibold" numberOfLines={1}>
                        {item.structured_formatting?.main_text || item.description}
                      </Text>
                      <Text className="text-muted text-xs" numberOfLines={1}>
                        {item.structured_formatting?.secondary_text || item.description}
                      </Text>
                    </View>
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#60a5fa" />
                    ) : isSelected ? (
                      <Text className="text-primary text-xs font-semibold">Selected</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {selectedPlace ? (
        <>
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
              {(selectedPlace.types[0] || 'place').replace('_', ' ')}
            </Text>
          </View>

          {renderActions()}
        </>
      ) : (
        <View className="items-center justify-center py-8">
          <Text className="text-muted text-sm">Select a restaurant to view details and actions.</Text>
        </View>
      )}
    </ScrollView>
  );
}
