import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  NavigationView,
  NavigationNightMode,
  NavigationUIEnabledPreference,
  type MapViewController,
  type MarkerOptions,
} from '@googlemaps/react-native-navigation-sdk';
import { useAuthStore, useRoomStore } from '../../store';
import { isLocationStale, isLocationDead, getLocationAgeMs } from '../../utils/room.utils';

interface MemberMarkerProps {
  userId: string;
  displayName: string;
  mapController: MapViewController | null;
  isMapReady: boolean;
}

const MemberMarker = React.memo(({ userId, displayName, mapController, isMapReady }: MemberMarkerProps) => {
  const location = useRoomStore((s) => s.locations[userId]);
  const currentUid = useAuthStore((s) => s.user?.id);
  const nativeIdRef = useRef<string | null>(null);
  const lastDrawnIsStaleRef = useRef<boolean>(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isMapReady || !mapController || !location || userId === currentUid) {
      if (nativeIdRef.current && mapController) {
        try {
          mapController.removeMarker(nativeIdRef.current);
        } catch (err) {
          console.warn("Failed to remove marker:", err);
        }
      }
      nativeIdRef.current = null;
      return;
    }

    const isStale = isLocationStale(location.updatedAt);
    const isDead = isLocationDead(location.updatedAt);

    if (isDead) {
      if (nativeIdRef.current && mapController) {
        try {
          mapController.removeMarker(nativeIdRef.current);
        } catch (err) {
          console.warn("Failed to remove dead marker:", err);
        }
      }
      nativeIdRef.current = null;
      return;
    }

    const ageMs = getLocationAgeMs(location.updatedAt);

    const newNativeId = `room-member-${userId}-${new Date(location.updatedAt).getTime()}`;
    const stalenessChanged = lastDrawnIsStaleRef.current !== isStale;

    if (nativeIdRef.current === newNativeId && !stalenessChanged) {
      return;
    }

    const secondsAgo = Math.max(1, Math.floor(ageMs / 1000));
    const minutesAgo = Math.floor(secondsAgo / 60);
    let snippet = 'Live';
    if (isStale && minutesAgo > 0) {
      snippet = `Last seen ${minutesAgo} min ago`;
    } else if (isStale) {
      snippet = 'Last seen recently';
    }

    const initial = displayName.trim() ? displayName.trim().charAt(0).toUpperCase() : '?';

    const markerPayload: MarkerOptions = {
      id: newNativeId,
      position: { lat: location.lat, lng: location.lng },
      title: `${initial} • ${displayName}`,
      snippet,
      alpha: isStale ? 0.6 : 1.0,
    };

    if (nativeIdRef.current) {
      try {
        mapController.removeMarker(nativeIdRef.current);
      } catch (err) {
        console.warn("Failed to remove old marker:", err);
      }
    }

    try {
      void mapController.addMarker(markerPayload);
      nativeIdRef.current = newNativeId;
      lastDrawnIsStaleRef.current = isStale;
    } catch (err) {
      console.warn("Failed to add marker for user:", userId, err);
    }
  }, [location, mapController, isMapReady, userId, displayName, currentUid, tick]);

  useEffect(() => {
    return () => {
      if (nativeIdRef.current && mapController) {
        try {
          mapController.removeMarker(nativeIdRef.current);
        } catch (err) {
          console.warn("Failed to remove marker on unmount for user:", userId, err);
        }
      }
    };
  }, [mapController, userId]);

  return null;
});
MemberMarker.displayName = 'MemberMarker';

interface MainMapProps {
  onMapReady?: () => void;
}

function MainMapInner({ onMapReady }: MainMapProps) {
  const members = useRoomStore((s) => s.members);
  const room = useRoomStore((s) => s.room);

  const [isMapReady, setIsMapReady] = useState(false);
  const mapControllerRef = useRef<MapViewController | null>(null);

  const handleMapControllerCreated = useCallback((controller: MapViewController) => {
    mapControllerRef.current = controller;
  }, []);

  const handleMapReady = useCallback(() => {
    setIsMapReady(true);
    onMapReady?.();
  }, [onMapReady]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <NavigationView
        style={StyleSheet.absoluteFill}
        navigationNightMode={NavigationNightMode.FORCE_NIGHT}
        navigationUIEnabledPreference={NavigationUIEnabledPreference.DISABLED}
        compassEnabled={false}
        myLocationEnabled={true}
        myLocationButtonEnabled={false}
        zoomControlsEnabled={true}
        indoorLevelPickerEnabled={true}
        headerEnabled={false}
        recenterButtonEnabled={false}
        footerEnabled={false}
        speedometerEnabled={false}
        speedLimitIconEnabled={false}
        tripProgressBarEnabled={false}
        reportIncidentButtonEnabled={false}
        onMapReady={handleMapReady}
        onMapViewControllerCreated={handleMapControllerCreated}
      />
      {isMapReady && room && members.map((member) => (
        <MemberMarker
          key={member.id}
          userId={member.id}
          displayName={member.name || 'Member'}
          mapController={mapControllerRef.current}
          isMapReady={isMapReady}
        />
      ))}
    </View>
  );
}

export const MainMap = React.memo(MainMapInner);
MainMap.displayName = 'MainMap';
