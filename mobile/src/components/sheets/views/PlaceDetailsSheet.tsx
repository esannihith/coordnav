import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { X, MapPin, Phone, Globe, Navigation, Share2 } from 'lucide-react-native';
import { useMapStore, useAppStore } from '@/store';
import { socketClient } from '@/services';

export function PlaceDetailsSheet() {
  const mapState = useMapStore((s) => s.state);
  const clearMap = useMapStore((s) => s.clear);
  const uiState = useAppStore((s) => s.uiState);

  if (mapState.kind !== 'PREVIEW_PLACE') {
    return null;
  }

  const { place } = mapState;
  const isInRoom = uiState === 'InRoom';

  // Formatting place types (e.g. ['restaurant', 'food'] -> 'Restaurant, Food')
  const formattedTypes = place.types
    ? place.types
        .filter((t) => !['point_of_interest', 'establishment'].includes(t))
        .map((t) => t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' '))
        .slice(0, 2)
        .join(', ')
    : '';

  const handleShareToRoom = () => {
    if (!place.geometry?.location) return;

    socketClient.sendPlace({
      placeId: place.place_id,
      name: place.name || 'Selected Location',
      address: place.formatted_address,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
    });

    // Dismiss the details preview layer to return to the active room screen
    clearMap();
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 }}>
      {/* Header with Title and Close Button */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <View style={{ flex: 1, marginRight: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#ffffff', lineHeight: 26 }} numberOfLines={2}>
            {place.name || 'Selected Location'}
          </Text>
          {formattedTypes ? (
            <Text style={{ fontSize: 13, color: '#3b82f6', marginTop: 4, fontWeight: '500' }}>{formattedTypes}</Text>
          ) : null}
        </View>

        <Pressable
          onPress={clearMap}
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#2c2c2e', alignItems: 'center', justifyContent: 'center' }}
          hitSlop={8}
        >
          <X color="#a3a3a3" size={20} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        {/* Address */}
        {place.formatted_address ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1c1c1e' }}>
            <MapPin color="#a3a3a3" size={18} style={{ marginRight: 12, marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: 14, color: '#e5e5ea', lineHeight: 20 }}>{place.formatted_address}</Text>
          </View>
        ) : null}

        {/* Phone */}
        {place.formatted_phone_number ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1c1c1e' }}>
            <Phone color="#a3a3a3" size={18} style={{ marginRight: 12, marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: 14, color: '#e5e5ea', lineHeight: 20 }}>{place.formatted_phone_number}</Text>
          </View>
        ) : null}

        {/* Website */}
        {place.website ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1c1c1e' }}>
            <Globe color="#a3a3a3" size={18} style={{ marginRight: 12, marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: 14, color: '#e5e5ea', lineHeight: 20 }} numberOfLines={1}>
              {place.website}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Action Button */}
      <View style={{ marginTop: 'auto', paddingTop: 12 }}>
        {isInRoom ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable
              onPress={handleShareToRoom}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#2c2c2e',
                borderWidth: 1,
                borderColor: 'rgba(59, 130, 246, 0.3)',
                height: 52,
                borderRadius: 16,
                marginRight: 12,
              }}
            >
              <Share2 color="#3b82f6" size={18} style={{ marginRight: 8 }} />
              <Text style={{ color: '#3b82f6', fontSize: 15, fontWeight: '600' }}>Share to Room</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                console.log('Get Directions to:', place.name);
                // Directions and routes will be implemented in subsequent steps.
              }}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#3b82f6',
                height: 52,
                borderRadius: 16,
              }}
            >
              <Navigation color="#121212" size={18} style={{ marginRight: 8 }} />
              <Text style={{ color: '#121212', fontSize: 15, fontWeight: '600' }}>Directions</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => {
              console.log('Get Directions to:', place.name);
              // Directions and routes will be implemented in subsequent steps.
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#3b82f6',
              height: 52,
              borderRadius: 16,
            }}
          >
            <Navigation color="#121212" size={18} style={{ marginRight: 8 }} />
            <Text style={{ color: '#121212', fontSize: 15, fontWeight: '600' }}>Get Directions</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
