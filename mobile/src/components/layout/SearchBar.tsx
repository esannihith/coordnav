import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Search, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function SearchBar() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="absolute top-0 left-0 right-0 px-4 pointer-events-box-none"
      style={{ paddingTop: insets.top + 8, zIndex: 1000 }}
    >
      <View className="flex-row items-center w-full bg-[#1e1e1e]/90 border border-border/80 h-14 rounded-2xl px-4 shadow-lg shadow-black/40 backdrop-blur-md">
        {/* Search icon + pressable search body */}
        <Pressable
          onPress={() => router.push('/search' as any)}
          className="flex-row items-center flex-1 h-full active:opacity-80"
        >
          <Search color="#a3a3a3" size={20} className="mr-3" />
          <Text className="text-zinc-500 text-[15px] flex-1">
            Search for places...
          </Text>
        </Pressable>

        {/* Divider */}
        <View className="w-px h-6 bg-[#1F2937] mx-3.5" />

        {/* Profile Avatar */}
        <Pressable
          onPress={() => router.push('/profile' as any)}
          className="w-10 h-10 rounded-full bg-secondary items-center justify-center border border-border/60 overflow-hidden active:opacity-75"
          hitSlop={8}
        >
          {user?.picture ? (
            <Image source={{ uri: user.picture }} className="w-full h-full" />
          ) : (
            <User color="#fff" size={20} />
          )}
        </Pressable>
      </View>
    </View>
  );
}
