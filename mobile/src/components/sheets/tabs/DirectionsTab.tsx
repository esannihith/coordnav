import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Navigation } from 'lucide-react-native';
import { useAppStore } from '../../../store/useAppStore';
import { getDirections } from '../../../services/directions';

export function DirectionsTab() {
  const { setUiState, uiState, selectedPlace, routes, setRoutes, selectedRouteId, setSelectedRouteId, travelMode } = useAppStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchRoutes() {
      if (selectedPlace) {
        setLoading(true);
        try {
          const res = await getDirections(selectedPlace.id, travelMode);
          if (mounted) {
            setRoutes(res);
            if (res.length > 0) {
              setSelectedRouteId(res[0].id);
            }
          }
        } catch (e) {
          console.error('Failed to fetch routes', e);
        } finally {
          if (mounted) setLoading(false);
        }
      }
    }
    fetchRoutes();
    return () => { mounted = false; };
  }, [selectedPlace, travelMode]);

  const handleStartNav = () => {
    if (uiState === 'InRoom') {
      setUiState('InRoomNavigating');
    } else {
      setUiState('NavigatingSolo');
    }
  };

  return (
    <View className="flex-1 px-4 pt-4">
      <View className="bg-secondary rounded-xl p-4 mb-4 border border-border">
        <View className="flex-row items-center mb-3">
          <View className="w-2 h-2 rounded-full bg-primary mr-3" />
          <Text className="text-foreground text-base">My Location</Text>
        </View>
        <View className="h-4 border-l border-border ml-1 mb-3" />
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-red-500 mr-3" />
          <Text className="text-foreground text-base font-semibold" numberOfLines={1}>
            {selectedPlace?.displayName?.text || 'Destination'}
          </Text>
        </View>
      </View>

      <Text className="text-muted text-sm mb-3 font-medium uppercase tracking-wider">Routes</Text>

      {loading ? (
        <View className="py-8">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <View className="flex-1">
          {routes.map((route) => {
            const isSelected = selectedRouteId === route.id;
            return (
              <TouchableOpacity 
                key={route.id}
                onPress={() => setSelectedRouteId(route.id)}
                className={`flex-row items-center p-4 rounded-xl mb-3 border ${
                  isSelected ? 'bg-primary/10 border-primary/30' : 'bg-secondary border-transparent'
                }`}
              >
                <View className="flex-1 mr-2">
                  <Text className={`${isSelected ? 'text-primary' : 'text-foreground'} font-bold text-xl mb-1`}>{route.duration}</Text>
                  <Text className="text-muted text-sm" numberOfLines={2}>{route.summary}</Text>
                </View>
                <Text className="text-foreground font-semibold">{route.distance}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View className="justify-end pb-6 mt-auto">
        <TouchableOpacity 
          onPress={handleStartNav}
          className="bg-primary py-4 rounded-xl items-center flex-row justify-center shadow-lg shadow-primary/30"
          disabled={loading || routes.length === 0}
          style={{ opacity: (loading || routes.length === 0) ? 0.5 : 1 }}
        >
          <Navigation color="#fff" size={20} className="mr-2" />
          <Text className="text-white font-bold text-lg">Start Navigation</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
