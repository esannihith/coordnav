import React, { useEffect } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Navigation, Compass, Crosshair, StopCircle } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';

export function FABStack() {
  const { uiState, setUiState } = useAppStore();

  const isNavigating = uiState === 'NavigatingSolo' || uiState === 'InRoomNavigating';

  const speedScale = useSharedValue(0);

  useEffect(() => {
    speedScale.value = withSpring(isNavigating ? 1 : 0, { damping: 15 });
  }, [isNavigating, speedScale]);

  const speedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: speedScale.value }],
    opacity: speedScale.value,
  }));

  const IconButton = ({ children, onPress, className }: { children: React.ReactNode, onPress?: () => void, className?: string }) => (
    <TouchableOpacity 
      onPress={onPress}
      className={cn(
        "w-12 h-12 rounded-full bg-secondary/90 items-center justify-center mb-3",
        "border border-border shadow-lg shadow-black/50 pointer-events-auto",
        className
      )}
    >
      {children}
    </TouchableOpacity>
  );

  return (
    <View className="pr-4 pb-4 items-center justify-end pointer-events-none">
      <Animated.View style={speedStyle} className="pointer-events-auto">
        <IconButton 
          onPress={() => setUiState(uiState === 'InRoomNavigating' ? 'InRoom' : 'Home')}
          className="bg-red-500/20 border-red-500/50"
        >
          <StopCircle color="#ef4444" size={24} />
        </IconButton>
        
        <View className="w-12 h-12 rounded-full bg-black/80 border-2 border-primary items-center justify-center mb-3">
          <Text className="text-white font-bold text-lg leading-tight">65</Text>
          <Text className="text-primary text-[8px] font-bold">MPH</Text>
        </View>
      </Animated.View>

      <IconButton>
        <Compass color="#fff" size={24} />
      </IconButton>

      <IconButton>
        <Crosshair color="#3b82f6" size={24} />
      </IconButton>
    </View>
  );
}
