import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Compass, Map } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useNavigation } from '@googlemaps/react-native-navigation-sdk';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';

const selectUiState = (s: ReturnType<typeof useAppStore.getState>) => s.uiState;

export function FABStack() {
  const uiState = useAppStore(selectUiState);
  const isNavigating = uiState === 'NavigatingSolo' || uiState === 'InRoomNavigating';

  const { setOnLocationChanged } = useNavigation();
  const [speedKmh, setSpeedKmh] = useState(0);

  const speedScale = useSharedValue(0);

  useEffect(() => {
    speedScale.value = withSpring(isNavigating ? 1 : 0, { damping: 15 });
  }, [isNavigating, speedScale]);

  // Live speed from SDK location updates
  useEffect(() => {
    if (isNavigating) {
      setOnLocationChanged((event) => {
        const loc = (event as any)?.location ?? event;
        if (loc && typeof loc.speed === 'number') {
          // speed is in m/s, convert to km/h
          setSpeedKmh(Math.round(loc.speed * 3.6));
        }
      });
    } else {
      setOnLocationChanged(null);
      setSpeedKmh(0);
    }

    return () => {
      setOnLocationChanged(null);
    };
  }, [isNavigating, setOnLocationChanged]);

  const speedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: speedScale.value }],
    opacity: speedScale.value,
  }));

  const IconButton = ({ children, onPress, className: btnClassName }: { children: React.ReactNode, onPress?: () => void, className?: string }) => (
    <TouchableOpacity 
      onPress={onPress}
      className={cn(
        "w-12 h-12 rounded-full bg-secondary/90 items-center justify-center mb-3",
        "border border-border shadow-lg shadow-black/50 pointer-events-auto",
        btnClassName
      )}
    >
      {children}
    </TouchableOpacity>
  );

  return (
    <View className="items-end pointer-events-none">
      <Animated.View style={speedStyle} className="pointer-events-auto">
        <IconButton className="bg-primary/20 border-primary/50">
          <Map color="#3b82f6" size={24} />
        </IconButton>
        
        <View className="w-12 h-12 rounded-full bg-black/80 border-2 border-primary items-center justify-center mb-3">
          <Text className="text-white font-bold text-lg leading-tight">{speedKmh}</Text>
          <Text className="text-primary text-[8px] font-bold">KM/H</Text>
        </View>
      </Animated.View>

      <IconButton>
        <Compass color="#fff" size={24} />
      </IconButton>
    </View>
  );
}
