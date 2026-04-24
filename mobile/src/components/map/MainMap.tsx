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
const selectActiveTab = (s: ReturnType<typeof useAppStore.getState>) => s.activeTab;
const selectSelectedPlace = (s: ReturnType<typeof useAppStore.getState>) => s.selectedPlace;
const selectSearchResults = (s: ReturnType<typeof useAppStore.getState>) => s.searchResults;

const selectRoomMembers = (s: ReturnType<typeof useRoomStore.getState>) => s.members;
const selectCurrentRoomCode = (s: ReturnType<typeof useRoomStore.getState>) => s.currentRoomCode;
const selectCurrentUid = (s: ReturnType<typeof useAuthStore.getState>) => s.user?.uid ?? null;

function getDisplayInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

function getMarkerColorFromUid(uid: string): string {
  const palette = ['#1d4ed8', '#0f766e', '#7c3aed', '#be123c', '#b45309', '#1f2937'];
  let hash = 0;
  for (let i = 0; i < uid.length; i += 1) {
    hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}

function buildInitialMarkerDataUri(initial: string, backgroundColor: string): string {
  const label = initial.slice(0, 1).toUpperCase();
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="84" height="84" viewBox="0 0 84 84">
  <circle cx="42" cy="42" r="30" fill="${backgroundColor}" />
  <circle cx="42" cy="42" r="29" fill="none" stroke="#ffffff" stroke-width="2" />
  <text x="42" y="49" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#ffffff">${label}</text>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getResultLocation(result: any): { lat: number; lng: number } | null {
  const location = result?.location;
  if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
    return location;
  }
  return null;
}

function MainMapInner() {
  const routes = useAppStore(selectRoutes);
  const insets = useSafeAreaInsets();
  const selectedRouteId = useAppStore(selectSelectedRouteId);
  const setSelectedRouteId = useAppStore(selectSetSelectedRouteId);
  const isNavActive = useAppStore(selectIsNavActive);
  const activeTab = useAppStore(selectActiveTab);
  const selectedPlace = useAppStore(selectSelectedPlace);
  const searchResults = useAppStore(selectSearchResults);

  const roomMembers = useRoomStore(selectRoomMembers);
  const currentRoomCode = useRoomStore(selectCurrentRoomCode);
  const currentUid = useAuthStore(selectCurrentUid);

  const [staleTick, setStaleTick] = useState(0);

  const mapControllerRef = useRef<MapViewController | null>(null);
  const isMapReadyRef = useRef(false);
  const drawnRouteIdsRef = useRef<Set<string>>(new Set());
  const drawnMemberMarkerIdsRef = useRef<Set<string>>(new Set());
  const memberMarkerSignaturesRef = useRef<Map<string, string>>(new Map());
  const drawnSearchMarkerIdsRef = useRef<Set<string>>(new Set());

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

    if (!currentRoomCode) {
      drawnMemberMarkerIdsRef.current.forEach((id) => removeMarker(id));
      drawnMemberMarkerIdsRef.current.clear();
      memberMarkerSignaturesRef.current.clear();
      return;
    }

    const now = Date.now();
    const nextIds = new Set<string>();
    const nextSignatures = new Map<string, string>();
    const markerUpdates: Array<{ id: string; signature: string; payload: any }> = [];

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
      const signature = [
        member.uid,
        displayName,
        member.photoURL || '',
        member.location.lat,
        member.location.lng,
        member.updatedAtMs || 0,
      ].join('|');
      const markerPayload: any = {
        id: markerId,
        position: member.location,
        coordinate: member.location,
        title: `${initial} • ${displayName}`,
        snippet: secondsAgo ? `Updated ${secondsAgo}s ago` : 'Live',
      };

      // Custom marker attempt. SDK/device may ignore icon payload; title/snippet remains fallback identity.
      if (member.photoURL) {
        markerPayload.icon = { uri: member.photoURL };
      } else {
        markerPayload.icon = {
          uri: buildInitialMarkerDataUri(initial, getMarkerColorFromUid(member.uid)),
        };
      }

      nextIds.add(markerId);
      nextSignatures.set(markerId, signature);
      markerUpdates.push({ id: markerId, signature, payload: markerPayload });
    });

    drawnMemberMarkerIdsRef.current.forEach((existingId) => {
      if (!nextIds.has(existingId)) {
        removeMarker(existingId);
      }
    });

    markerUpdates.forEach(({ id, signature, payload }) => {
      const previousSignature = memberMarkerSignaturesRef.current.get(id);
      if (previousSignature === signature) {
        return;
      }

      if (previousSignature) {
        removeMarker(id);
      }

      try {
        addMarker(payload);
      } catch {
        const fallbackPayload = { ...payload };
        delete fallbackPayload.icon;
        addMarker(fallbackPayload);
      }
    });

    drawnMemberMarkerIdsRef.current = nextIds;
    memberMarkerSignaturesRef.current = nextSignatures;
  }, [roomMembers, currentRoomCode, staleTick, currentUid]);

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

    drawnSearchMarkerIdsRef.current.forEach((id) => removeMarker(id));
    drawnSearchMarkerIdsRef.current.clear();

    if (activeTab !== 'Place') {
      return;
    }

    if (selectedPlace?.location) {
      const selectedMarkerId = `search-selected-${selectedPlace.id}`;
      addMarker({
        id: selectedMarkerId,
        position: selectedPlace.location,
        coordinate: selectedPlace.location,
        title: selectedPlace.displayName?.text || 'Selected Place',
        snippet: selectedPlace.formattedAddress || '',
      });
      drawnSearchMarkerIdsRef.current.add(selectedMarkerId);
    }

    (searchResults as any[]).forEach((result, index) => {
      const location = getResultLocation(result);
      if (!location) {
        return;
      }

      const placeId = result?.place_id || `idx-${index}`;
      if (selectedPlace?.id && placeId === selectedPlace.id) {
        return;
      }

      const markerId = `search-result-${placeId}`;
      addMarker({
        id: markerId,
        position: location,
        coordinate: location,
        title: result?.structured_formatting?.main_text || result?.description || 'Place',
        snippet: result?.structured_formatting?.secondary_text || '',
      });
      drawnSearchMarkerIdsRef.current.add(markerId);
    });
  }, [activeTab, selectedPlace, searchResults]);

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
      memberMarkerSignaturesRef.current.clear();
      drawnSearchMarkerIdsRef.current.forEach((id) => {
        if (typeof controller.removeMarker === 'function') {
          controller.removeMarker(id);
        } else if (typeof controller.removeMarkerById === 'function') {
          controller.removeMarkerById(id);
        }
      });

      drawnRouteIdsRef.current.clear();
      drawnMemberMarkerIdsRef.current.clear();
      drawnSearchMarkerIdsRef.current.clear();
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
