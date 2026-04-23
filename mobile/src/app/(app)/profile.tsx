import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { cn } from '../../lib/utils';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: Math.max(insets.top, 16) }}>
      <View className="px-4 pb-4 pt-2 flex-row items-center border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ChevronLeft color="#fff" size={28} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-foreground">Profile</Text>
      </View>

      <View className="flex-1 items-center justify-center p-4">
        <View className="w-24 h-24 rounded-full bg-secondary items-center justify-center mb-6 border border-border">
          <User color="#3b82f6" size={48} />
        </View>
        <Text className="text-2xl font-bold text-foreground mb-2">User Settings</Text>
        <Text className="text-muted text-center mb-8">
          This is a placeholder profile screen for the demo.
        </Text>
      </View>
    </View>
  );
}
