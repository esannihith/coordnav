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

  return (
    <View 
      className={cn(
        "px-4 pb-4 pt-2 flex-row items-center justify-between pointer-events-auto",
        "bg-background/80"
      )}
      style={{ paddingTop: Math.max(insets.top, 16) }}
    >
      <View className="flex-row items-center flex-1">
        <Text className="text-2xl font-black text-foreground tracking-tight">CoordNav</Text>
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
