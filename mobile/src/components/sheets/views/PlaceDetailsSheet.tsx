import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { X, MapPin, Phone, Globe, Navigation } from 'lucide-react-native';
import { useMapStore } from '@/store';

export function PlaceDetailsSheet() {
  const mapState = useMapStore((s) => s.state);
  const clearMap = useMapStore((s) => s.clear);

  if (mapState.kind !== 'PREVIEW_PLACE') {
    return null;
  }

  const { place } = mapState;

  // Formatting place types (e.g. ['restaurant', 'food'] -> 'Restaurant, Food')
  const formattedTypes = place.types
    ? place.types
        .filter((t) => !['point_of_interest', 'establishment'].includes(t))
        .map((t) => t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' '))
        .slice(0, 2)
        .join(', ')
    : '';

  return (
    <View style={styles.container}>
      {/* Header with Title and Close Button */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {place.name || 'Selected Location'}
          </Text>
          {formattedTypes ? (
            <Text style={styles.typeText}>{formattedTypes}</Text>
          ) : null}
        </View>

        <Pressable
          onPress={clearMap}
          style={styles.closeButton}
          hitSlop={8}
        >
          <X color="#a3a3a3" size={20} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Address */}
        {place.formatted_address ? (
          <View style={styles.infoRow}>
            <MapPin color="#a3a3a3" size={18} style={styles.infoIcon} />
            <Text style={styles.infoText}>{place.formatted_address}</Text>
          </View>
        ) : null}

        {/* Phone */}
        {place.formatted_phone_number ? (
          <View style={styles.infoRow}>
            <Phone color="#a3a3a3" size={18} style={styles.infoIcon} />
            <Text style={styles.infoText}>{place.formatted_phone_number}</Text>
          </View>
        ) : null}

        {/* Website */}
        {place.website ? (
          <View style={styles.infoRow}>
            <Globe color="#a3a3a3" size={18} style={styles.infoIcon} />
            <Text style={styles.infoText} numberOfLines={1}>
              {place.website}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Action Button */}
      <View style={styles.actionContainer}>
        <Pressable
          onPress={() => {
            console.log('Get Directions to:', place.name);
            // Directions and routes will be implemented in subsequent steps.
          }}
          style={styles.directionsButton}
        >
          <Navigation color="#121212" size={18} style={styles.buttonIcon} />
          <Text style={styles.directionsButtonText}>Get Directions</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 26,
  },
  typeText: {
    fontSize: 13,
    color: '#3b82f6',
    marginTop: 4,
    fontWeight: '500',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2c2c2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1c1e',
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#e5e5ea',
    lineHeight: 20,
  },
  actionContainer: {
    marginTop: 'auto',
    paddingTop: 12,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    height: 52,
    borderRadius: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  directionsButtonText: {
    color: '#121212',
    fontSize: 15,
    fontWeight: '600',
  },
});
