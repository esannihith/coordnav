import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';

export function Header() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { uiState, roomCode, roomName, leaveRoom } = useAppStore();

  const isRoomMode = uiState === 'InRoom' || uiState === 'InRoomNavigating';
  const title = isRoomMode ? (roomName || `Room #${roomCode || '000'}`) : 'TripRoom';

  return (
    <View 
      className={cn(
        "px-4 pb-4 pt-2 flex-row items-center justify-between pointer-events-auto",
        "bg-background/80" // Glassmorphism-ish translucent dark
      )}
      style={{ paddingTop: Math.max(insets.top, 16) }}
    >
      <View className="flex-row items-center flex-1">
        {isRoomMode && (
          <TouchableOpacity onPress={leaveRoom} className="mr-3">
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
        )}
        <Text className="text-xl font-bold text-foreground">{title}</Text>
        {isRoomMode && (
          <View className="ml-3 px-2 py-1 rounded-full bg-green-500/20">
            <Text className="text-xs text-green-400 font-medium">3 online</Text>
          </View>
        )}
      </View>

      <TouchableOpacity 
        className="w-10 h-10 rounded-full bg-secondary items-center justify-center border border-border"
        onPress={() => router.push('/profile')}
      >
        <User color="#fff" size={20} />
      </TouchableOpacity>
    </View>
  );
}
