import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  NavigationView,
  NavigationNightMode,
  NavigationUIEnabledPreference,
  type MapViewController,
} from '@googlemaps/react-native-navigation-sdk';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useRoomStore } from '../../store/useRoomStore';
import { calculateBoundsCamera } from '../../utils/mapCamera';
import { isMemberStale } from '../../services/roomService';

const selectRoutes = (s: ReturnType<typeof useAppStore.getState>) => s.routes;
const selectSelectedRouteId = (s: ReturnType<typeof useAppStore.getState>) => s.selectedRouteId;
const selectSetSelectedRouteId = (s: ReturnType<typeof useAppStore.getState>) => s.setSelectedRouteId;
const selectIsNavActive = (s: ReturnType<typeof useAppStore.getState>) => s.isNavSessionActive;

const selectRoomMembers = (s: ReturnType<typeof useRoomStore.getState>) => s.members;
const selectCurrentRoomCode = (s: ReturnType<typeof useRoomStore.getState>) => s.currentRoomCode;
const selectCurrentUid = (s: ReturnType<typeof useAuthStore.getState>) => s.user?.uid ?? null;

function getDisplayInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

function MainMapInner() {
  const routes = useAppStore(selectRoutes);
  const insets = useSafeAreaInsets();
  const selectedRouteId = useAppStore(selectSelectedRouteId);
  const setSelectedRouteId = useAppStore(selectSetSelectedRouteId);
  const isNavActive = useAppStore(selectIsNavActive);

  const roomMembers = useRoomStore(selectRoomMembers);
  const currentRoomCode = useRoomStore(selectCurrentRoomCode);
  const currentUid = useAuthStore(selectCurrentUid);

  const [staleTick, setStaleTick] = useState(0);

  const mapControllerRef = useRef<MapViewController | null>(null);
  const isMapReadyRef = useRef(false);
  const drawnRouteIdsRef = useRef<Set<string>>(new Set());
  const drawnMemberMarkerIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const timer = setInterval(() => setStaleTick((tick) => tick + 1), 15_000);
    return () => clearInterval(timer);
  }, []);

  const handleMapControllerCreated = useCallback((controller: MapViewController) => {
    mapControllerRef.current = controller;
  }, []);

  const handleMapReady = useCallback(() => {
    isMapReadyRef.current = true;
  }, []);

  const handlePolylineClick = useCallback(
    (polyline: { id?: string }) => {
      if (polyline.id) {
        setSelectedRouteId(polyline.id.replace('route-', ''));
      }
    },
    [setSelectedRouteId]
  );

  useEffect(() => {
    const controller = mapControllerRef.current;
    if (!controller || !isMapReadyRef.current) return;

    if (isNavActive) {
      drawnRouteIdsRef.current.forEach((id) => controller.removePolyline(id));
      drawnRouteIdsRef.current.clear();
      return;
    }

    const updateRoutes = async () => {
      const currentIds = new Set<string>();

      for (const route of routes) {
        if (route.id === selectedRouteId) continue;

        const id = `route-${route.id}`;
        currentIds.add(id);

        controller.addPolyline({
          id,
          points: route.points,
          color: '#64748b',
          width: 7,
          geodesic: true,
          clickable: true,
        } as any);
      }

      const selectedRoute = routes.find((route: any) => route.id === selectedRouteId);
      if (selectedRoute) {
        const id = `route-${selectedRoute.id}`;
        currentIds.add(id);

        controller.addPolyline({
          id,
          points: selectedRoute.points,
          color: '#3b82f6',
          width: 14,
          geodesic: true,
          clickable: true,
        } as any);
      }

      drawnRouteIdsRef.current.forEach((oldId) => {
        if (!currentIds.has(oldId)) {
          controller.removePolyline(oldId);
        }
      });
      drawnRouteIdsRef.current = currentIds;

      if (selectedRoute) {
        const camera = calculateBoundsCamera(selectedRoute.points);
        if (camera) await controller.moveCamera(camera);
      }
    };

    void updateRoutes();
  }, [routes, selectedRouteId, isNavActive]);

  useEffect(() => {
    const controller = mapControllerRef.current as any;
    if (!controller || !isMapReadyRef.current) return;

    const addMarker = typeof controller.addMarker === 'function' ? controller.addMarker.bind(controller) : null;
    const removeMarker =
      typeof controller.removeMarker === 'function'
        ? (id: string) => controller.removeMarker(id)
        : typeof controller.removeMarkerById === 'function'
          ? (id: string) => controller.removeMarkerById(id)
          : null;

    if (!addMarker || !removeMarker) {
      return;
    }

    drawnMemberMarkerIdsRef.current.forEach((id) => removeMarker(id));
    drawnMemberMarkerIdsRef.current.clear();

    if (!currentRoomCode) {
      return;
    }

    const now = Date.now();

    roomMembers.forEach((member) => {
      if (member.uid === currentUid) {
        // Self is represented by the SDK blue-dot.
        return;
      }

      if (!member.location || !member.isSharing || isMemberStale(member, now)) {
        return;
      }

      const markerId = `room-member-${member.uid}`;
      const secondsAgo = member.updatedAtMs ? Math.max(1, Math.floor((now - member.updatedAtMs) / 1000)) : null;
      const displayName = member.displayName || 'Member';
      const initial = getDisplayInitial(displayName);
      const markerPayload: any = {
        id: markerId,
        position: member.location,
        coordinate: member.location,
        title: member.photoURL ? displayName : `${initial} • ${displayName}`,
        snippet: secondsAgo ? `Updated ${secondsAgo}s ago` : 'Live',
      };

      // Avatar marker attempt. SDK/device may ignore custom icon fields; title/snippet acts as fallback.
      if (member.photoURL) {
        markerPayload.icon = { uri: member.photoURL };
      }

      addMarker(markerPayload);

      drawnMemberMarkerIdsRef.current.add(markerId);
    });
  }, [roomMembers, currentRoomCode, staleTick, currentUid]);

  useEffect(() => {
    const unsub = useAppStore.subscribe((state, prevState) => {
      const controller = mapControllerRef.current;
      if (!controller || !isMapReadyRef.current) return;

      if (state.selectedPlace !== prevState.selectedPlace && state.selectedPlace?.location) {
        if (state.routes.length === 0) {
          controller.moveCamera({ target: state.selectedPlace.location, zoom: 15 });
        }
      }
    });

    return unsub;
  }, []);

  useEffect(() => {
    return () => {
      const controller = mapControllerRef.current as any;
      if (!controller) return;

      drawnRouteIdsRef.current.forEach((id) => {
        controller.removePolyline?.(id);
      });
      drawnMemberMarkerIdsRef.current.forEach((id) => {
        if (typeof controller.removeMarker === 'function') {
          controller.removeMarker(id);
        } else if (typeof controller.removeMarkerById === 'function') {
          controller.removeMarkerById(id);
        }
      });

      drawnRouteIdsRef.current.clear();
      drawnMemberMarkerIdsRef.current.clear();
    };
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      <NavigationView
        style={[StyleSheet.absoluteFill, { marginTop: isNavActive ? insets.top : 0 }]}
        navigationNightMode={NavigationNightMode.FORCE_NIGHT}
        navigationUIEnabledPreference={NavigationUIEnabledPreference.AUTOMATIC}
        compassEnabled={false}
        myLocationEnabled={true}
        myLocationButtonEnabled={false}
        zoomControlsEnabled={true}
        indoorLevelPickerEnabled={true}
        headerEnabled={isNavActive}
        recenterButtonEnabled={false}
        footerEnabled={false}
        speedometerEnabled={false}
        speedLimitIconEnabled={false}
        tripProgressBarEnabled={false}
        reportIncidentButtonEnabled={false}
        onMapReady={handleMapReady}
        onMapViewControllerCreated={handleMapControllerCreated}
        onPolylineClick={handlePolylineClick}
      />
    </View>
  );
}

export const MainMap = React.memo(MainMapInner);
