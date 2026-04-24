import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { cn } from '../../lib/utils';

export function Header() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();

  return (
    <View 
      className={cn(
        "px-4 pb-4 pt-2 flex-row items-center justify-between pointer-events-box-none",
        "bg-background/80"
      )}
      style={{ paddingTop: Math.max(insets.top, 16), zIndex: 1000 }}
    >
      <View className="flex-row items-center flex-1 pointer-events-none">
        <Text className="text-2xl font-black text-foreground tracking-tight">CoordNav</Text>
      </View>

      <TouchableOpacity 
        className="w-10 h-10 rounded-full bg-secondary items-center justify-center border border-border overflow-hidden pointer-events-auto"
        onPress={() => {
          console.log('Profile button pressed');
          router.push('/profile');
        }}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {user?.photoURL ? (
          <Image source={{ uri: user.photoURL }} className="w-full h-full" />
        ) : (
          <User color="#fff" size={20} />
        )}
      </TouchableOpacity>
    </View>
  );
}
