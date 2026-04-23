import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ToastAndroid } from 'react-native';
import { NavigationView, NavigationNightMode, MapViewController } from '@googlemaps/react-native-navigation-sdk';
import { useAppStore } from '../../store/useAppStore';
import { calculateBoundsCamera } from '../../utils/mapCamera';

export function MainMap() {
  const { uiState, routes, selectedRouteId, setSelectedRouteId, selectedPlace } = useAppStore();
  const [mapController, setMapController] = useState<MapViewController | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Track currently drawn polylines to avoid unnecessary updates
  const drawnIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (uiState === 'NavigatingSolo' || uiState === 'InRoomNavigating') {
      ToastAndroid.show('Start Navigation: Deferred (TODO)', ToastAndroid.SHORT);
    }
  }, [uiState]);

  useEffect(() => {
    if (!mapController || !isMapReady) return;

    const updateRoutes = async () => {
      const currentIds = new Set<string>();

      // Draw/update non-selected routes (thin gray)
      routes
        .filter(r => r.id !== selectedRouteId)
        .forEach(route => {
          const id = `route-${route.id}`;
          currentIds.add(id);

          mapController.addPolyline({
            id,
            points: route.points,
            color: '#64748b',
            width: 7,
            geodesic: true,
            clickable: true,
          } as any);
        });

      // Draw/update selected route LAST (thick blue) → appears on top
      const selectedRoute = routes.find(r => r.id === selectedRouteId);
      if (selectedRoute) {
        const id = `route-${selectedRoute.id}`;
        currentIds.add(id);

        mapController.addPolyline({
          id,
          points: selectedRoute.points,
          color: '#3b82f6',
          width: 14,
          geodesic: true,
          clickable: true,
        } as any);
      }

      // Remove any old polylines that no longer exist
      drawnIdsRef.current.forEach(oldId => {
        if (!currentIds.has(oldId)) {
          mapController.removePolyline(oldId);
        }
      });

      drawnIdsRef.current = currentIds;

      // Camera logic unchanged
      if (selectedRoute) {
        const camera = calculateBoundsCamera(selectedRoute.points);
        if (camera) await mapController.moveCamera(camera);
      } else if (selectedPlace?.location) {
        await mapController.moveCamera({ target: selectedPlace.location, zoom: 15 });
      }
    };

    updateRoutes();
  }, [mapController, isMapReady, selectedPlace, routes, selectedRouteId]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <NavigationView
        style={StyleSheet.absoluteFill}
        navigationNightMode={NavigationNightMode.FORCE_NIGHT}
        compassEnabled={false}
        myLocationButtonEnabled={false}
        zoomControlsEnabled={false}
        headerEnabled={false}
        footerEnabled={false}
        onMapReady={() => setIsMapReady(true)}
        onMapViewControllerCreated={setMapController}
        onPolylineClick={(polyline) => {
          if (polyline.id) {
            const id = polyline.id.replace('route-', '');
            setSelectedRouteId(id);
          }
        }}
      />
    </View>
  );
}