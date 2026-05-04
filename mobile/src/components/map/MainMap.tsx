import React, { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, View, StyleSheet } from 'react-native';
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
import { isMemberStale, isMemberDead } from '../../services/roomService';

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

  // staleTick increments every 15s to evict stale member markers.
  // forceRedrawTick is bumped imperatively (e.g. on foreground restore) to force
  // a full marker redraw even when roomMembers hasn't changed.
  const [staleTick, setStaleTick] = useState(0);
  const [forceRedrawTick, setForceRedrawTick] = useState(0);

  // isMapReady is React state (not just a ref) so that effects depending on
  // it automatically re-run the moment the SDK map becomes ready.
  const [isMapReady, setIsMapReady] = useState(false);

  const mapControllerRef = useRef<MapViewController | null>(null);
  // Kept in sync with the isMapReady state for synchronous checks inside effect bodies.
  const isMapReadyRef = useRef(false);
  const drawnRouteIdsRef = useRef<Set<string>>(new Set());
  
  // Maps a member's UID to the actual string ID currently drawn on the native map
  const memberNativeIdMapRef = useRef<Map<string, string>>(new Map());
  // Maps a member's UID to their current visual signature
  const memberMarkerSignaturesRef = useRef<Map<string, string>>(new Map());
  
  const drawnSearchMarkerIdsRef = useRef<Set<string>>(new Set());

  // Sync ref with state so effect bodies can do synchronous reads.
  useEffect(() => {
    isMapReadyRef.current = isMapReady;
  }, [isMapReady]);

  useEffect(() => {
    const timer = setInterval(() => setStaleTick((tick) => tick + 1), 15_000);
    return () => clearInterval(timer);
  }, []);

  // When the app comes back to the foreground the native map view may have
  // discarded its imperative state (markers). Clear the signature cache so
  // the next effect run redraws every member marker unconditionally.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        memberMarkerSignaturesRef.current.clear();
        setForceRedrawTick((tick) => tick + 1);
      }
    });
    return () => subscription.remove();
  }, []);

  const handleMapControllerCreated = useCallback((controller: MapViewController) => {
    mapControllerRef.current = controller;
  }, []);

  const handleMapReady = useCallback(() => {
    isMapReadyRef.current = true;
    setIsMapReady(true);
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
    if (!isMapReady) return;
    const controller = mapControllerRef.current;
    if (!controller) return;

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
  }, [routes, selectedRouteId, isNavActive, isMapReady]);

  useEffect(() => {
    if (!isMapReady) return;
    const controller = mapControllerRef.current as any;
    if (!controller) return;

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
      memberNativeIdMapRef.current.forEach((nativeId) => removeMarker(nativeId));
      memberNativeIdMapRef.current.clear();
      memberMarkerSignaturesRef.current.clear();
      return;
    }

    const now = Date.now();
    const activeMemberUids = new Set<string>();

    roomMembers.forEach((member) => {
      if (member.uid === currentUid) {
        // Self is represented by the SDK blue-dot.
        return;
      }

      if (!member.location || !member.isSharing || isMemberDead(member, now)) {
        return;
      }

      activeMemberUids.add(member.uid);
      const displayName = member.displayName || 'Member';
      const initial = getDisplayInitial(displayName);
      
      const isStale = isMemberStale(member, now);
      const secondsAgo = member.updatedAtMs ? Math.max(1, Math.floor((now - member.updatedAtMs) / 1000)) : 0;
      const minutesAgo = Math.floor(secondsAgo / 60);

      const signature = [
        member.uid,
        displayName,
        member.photoURL || '',
        member.location.lat,
        member.location.lng,
        member.updatedAtMs || 0,
        isStale,
        isStale ? minutesAgo : 0
      ].join('|');

      const previousSignature = memberMarkerSignaturesRef.current.get(member.uid);
      if (previousSignature === signature) {
        // Nothing changed visually — skip native call.
        return;
      }

      // Signature changed (or brand new member).
      // We generate a completely unique native ID for this specific update.
      // This PREVENTS the React Native bridge race condition where removeMarker(X) and addMarker(X)
      // are called synchronously, causing the native SDK to accidentally delete the new marker.
      const newNativeId = `room-member-${member.uid}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      let snippet = 'Live';
      if (isStale && minutesAgo > 0) {
        snippet = `Last seen ${minutesAgo} min ago`;
      } else if (isStale) {
        snippet = 'Last seen recently';
      }

      const markerPayload: any = {
        id: newNativeId,
        position: member.location,
        coordinate: member.location,
        title: `${initial} • ${displayName}`,
        snippet,
        opacity: isStale ? 0.6 : 1.0,
      };

      // Temporarily stripping custom icon payload to debug asynchronous native crash.
      // Native SDK may be rejecting remote URLs and SVG Data URIs dynamically.

      // Remove the old marker if it exists BEFORE adding the new one with a different ID
      const oldNativeId = memberNativeIdMapRef.current.get(member.uid);
      if (oldNativeId) {
        removeMarker(oldNativeId);
      }

      try {
        addMarker(markerPayload);
        memberNativeIdMapRef.current.set(member.uid, newNativeId);
        memberMarkerSignaturesRef.current.set(member.uid, signature);
      } catch {
        const fallbackPayload = { ...markerPayload };
        delete fallbackPayload.icon;
        try {
          addMarker(fallbackPayload);
          memberNativeIdMapRef.current.set(member.uid, newNativeId);
          memberMarkerSignaturesRef.current.set(member.uid, signature);
        } catch {
          // Both failed, swallow
        }
      }
    });

    // Cleanup members who left the room or went completely stale.
    for (const [uid, nativeId] of memberNativeIdMapRef.current.entries()) {
      if (!activeMemberUids.has(uid)) {
        removeMarker(nativeId);
        memberNativeIdMapRef.current.delete(uid);
        memberMarkerSignaturesRef.current.delete(uid);
      }
    }
  // forceRedrawTick is bumped on foreground restore to force a full redraw.
  // staleTick fires every 15s to evict members whose location went stale.
  }, [roomMembers, currentRoomCode, staleTick, forceRedrawTick, currentUid, isMapReady]);

  useEffect(() => {
    if (!isMapReady) return;
    const controller = mapControllerRef.current as any;
    if (!controller) return;

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
  }, [activeTab, selectedPlace, searchResults, isMapReady]);

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
      memberNativeIdMapRef.current.forEach((id) => {
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
      memberNativeIdMapRef.current.clear();
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
