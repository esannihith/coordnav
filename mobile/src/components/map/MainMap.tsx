import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  NavigationView,
  NavigationNightMode,
  NavigationUIEnabledPreference,
  type MapViewController,
  type NavigationViewController,
} from '@googlemaps/react-native-navigation-sdk';
import { useAppStore } from '../../store/useAppStore';
import { calculateBoundsCamera } from '../../utils/mapCamera';

// Selectors — each returns only the slice of state this component needs,
// preventing re-renders from unrelated store changes (uiState, activeTab, search, etc.)
const selectRoutes = (s: ReturnType<typeof useAppStore.getState>) => s.routes;
const selectSelectedRouteId = (s: ReturnType<typeof useAppStore.getState>) => s.selectedRouteId;
const selectSetSelectedRouteId = (s: ReturnType<typeof useAppStore.getState>) => s.setSelectedRouteId;
const selectIsNavActive = (s: ReturnType<typeof useAppStore.getState>) => s.isNavSessionActive;

function MainMapInner() {
  const routes = useAppStore(selectRoutes);
  const insets = useSafeAreaInsets();
  const selectedRouteId = useAppStore(selectSelectedRouteId);
  const setSelectedRouteId = useAppStore(selectSetSelectedRouteId);
  const isNavActive = useAppStore(selectIsNavActive);

  const mapControllerRef = useRef<MapViewController | null>(null);
  const navViewControllerRef = useRef<NavigationViewController | null>(null);
  const isMapReadyRef = useRef(false);
  const drawnIdsRef = useRef<Set<string>>(new Set());

  // Stable callback: store controller ref without triggering re-render
  const handleMapControllerCreated = useCallback((controller: MapViewController) => {
    mapControllerRef.current = controller;
  }, []);

  const handleNavViewControllerCreated = useCallback((controller: NavigationViewController) => {
    navViewControllerRef.current = controller;
  }, []);

  const handleMapReady = useCallback(() => {
    isMapReadyRef.current = true;
  }, []);

  const handlePolylineClick = useCallback((polyline: { id?: string }) => {
    if (polyline.id) {
      setSelectedRouteId(polyline.id.replace('route-', ''));
    }
  }, [setSelectedRouteId]);

  // Polyline + camera sync — only for route preview (GetDirections/RouteSelection).
  // During active navigation, the SDK renders the route natively.
  useEffect(() => {
    const controller = mapControllerRef.current;
    if (!controller || !isMapReadyRef.current) return;

    // If SDK navigation is active, clear our manual polylines (SDK handles route)
    if (isNavActive) {
      drawnIdsRef.current.forEach(id => controller.removePolyline(id));
      drawnIdsRef.current.clear();
      return;
    }

    const updateRoutes = async () => {
      const currentIds = new Set<string>();

      // Draw non-selected routes (thin gray)
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

      // Draw selected route LAST (thick blue) → appears on top
      const selectedRoute = routes.find((r: any) => r.id === selectedRouteId);
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

      // Remove stale polylines
      drawnIdsRef.current.forEach(oldId => {
        if (!currentIds.has(oldId)) {
          controller.removePolyline(oldId);
        }
      });
      drawnIdsRef.current = currentIds;

      // Camera: fit bounds for selected route
      if (selectedRoute) {
        const camera = calculateBoundsCamera(selectedRoute.points);
        if (camera) await controller.moveCamera(camera);
      }
    };

    updateRoutes();
  }, [routes, selectedRouteId, isNavActive]);

  // Camera pan for selectedPlace — read imperatively to avoid subscription
  useEffect(() => {
    const unsub = useAppStore.subscribe((state, prevState) => {
      const controller = mapControllerRef.current;
      if (!controller || !isMapReadyRef.current) return;

      // Only react when selectedPlace changes
      if (state.selectedPlace !== prevState.selectedPlace && state.selectedPlace?.location) {
        // Don't pan if we have active routes (route camera takes priority)
        if (state.routes.length === 0) {
          controller.moveCamera({ target: state.selectedPlace.location, zoom: 15 });
        }
      }
    });
    return unsub;
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      <NavigationView
        style={[StyleSheet.absoluteFill, { marginTop: isNavActive ? insets.top : 0 }]}
        navigationNightMode={NavigationNightMode.FORCE_NIGHT}
        navigationUIEnabledPreference={NavigationUIEnabledPreference.AUTOMATIC}
        compassEnabled={false}
        myLocationButtonEnabled={false}
        zoomControlsEnabled={true}
        indoorLevelPickerEnabled={true}
        // SDK native UI — only header enabled during active navigation
        headerEnabled={isNavActive}
        recenterButtonEnabled={false}
        footerEnabled={false}
        speedometerEnabled={false}
        speedLimitIconEnabled={false}
        tripProgressBarEnabled={false}
        reportIncidentButtonEnabled={false}
        onMapReady={handleMapReady}
        onMapViewControllerCreated={handleMapControllerCreated}
        onNavigationViewControllerCreated={handleNavViewControllerCreated}
        onPolylineClick={handlePolylineClick}
      />
    </View>
  );
}

// Memo prevents re-render from parent (MapLayout) state changes
export const MainMap = React.memo(MainMapInner);