import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { X, MapPin } from 'lucide-react-native';
import { useAppStore, useRoomStore } from '@/store';
import { useRoomEntry } from '@/hooks/useRoomEntry';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export function CreateRoomSheet() {
  const setUiState = useAppStore((s) => s.setUiState);
  const { createRoom, actionLoading, error, tempSelectedDestination, setTempSelectedDestination } = useRoomStore();
  const router = useRouter();

  const [roomName, setRoomName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const enterRoom = useRoomEntry();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    setTempSelectedDestination(null);
  }, [setTempSelectedDestination]);

  // Local state for interactive mock controls
  const [maxMembers, setMaxMembers] = useState(10);
  const [expiry, setExpiry] = useState<'1h' | '4h' | '24h'>('1h');

  const handleCreate = async () => {
    if (!roomName.trim() || isSubmitting || actionLoading) return;
    setIsSubmitting(true);
    try {
      await enterRoom(() => createRoom(roomName, tempSelectedDestination));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = actionLoading || isSubmitting;

  return (
    <View className="flex-1 px-6 pt-2 overflow-hidden" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
      {/* Header (Naturally compact to fit snapPoint) */}
      <View className="pt-3 pb-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-white text-2xl font-bold">
            Create a room
          </Text>
          <Pressable
            onPress={() => setUiState('Home')}
            disabled={isBusy}
            className="w-8 h-8 items-center justify-center rounded-full bg-secondary"
            hitSlop={8}
          >
            <X color="#a3a3a3" size={16} />
          </Pressable>
        </View>
      </View>

      <BottomSheetScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* Description Text (Falls below the 120px fold) */}
        <Text className="text-muted text-xs mb-4 leading-5">
          Set up a new trip and invite friends to share live location.
        </Text>

        {/* Room Name Input */}
        <Text className="text-white text-xs font-semibold uppercase tracking-wider mb-2">
          Room name
        </Text>
        <View className="h-10 bg-[#1e1e1e] rounded-xl border border-border px-3.5 justify-center mb-4">
          <BottomSheetTextInput
            value={roomName}
            onChangeText={setRoomName}
            placeholder="e.g. Goa Trip, Weekend Ride…"
            placeholderTextColor="#666666"
            editable={!isBusy}
            className="text-foreground text-sm flex-1 p-0"
          />
        </View>

        {/* Destination Input */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-x-2">
            <Text className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">
              Destination
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push('/search?mode=create_destination' as any)}
          disabled={isBusy}
          className="h-10 bg-[#1e1e1e] rounded-xl border border-border px-3.5 flex-row items-center mb-4 active:opacity-70"
        >
          <MapPin color="#a3a3a3" size={16} className="mr-2" />
          <Text className={`text-sm flex-1 ${tempSelectedDestination ? 'text-white' : 'text-zinc-500'}`} numberOfLines={1}>
            {tempSelectedDestination ? tempSelectedDestination.name : 'Add a destination…'}
          </Text>
          {tempSelectedDestination && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                setTempSelectedDestination(null);
              }}
              hitSlop={6}
            >
              <X color="#ef4444" size={16} />
            </Pressable>
          )}
        </Pressable>
        {/* Submit Button */}
        <Pressable
          onPress={handleCreate}
          disabled={isBusy || !roomName.trim()}
          className="w-full bg-primary h-12 rounded-2xl items-center justify-center active:opacity-90"
          style={{ opacity: roomName.trim() && !isBusy ? 1 : 0.6 }}
        >
          {isBusy ? (
            <ActivityIndicator size="small" color="#121212" />
          ) : (
            <Text className="text-[#121212] font-bold text-[15px]">
              Create room
            </Text>
          )}
        </Pressable>

        {/* Error Message */}
        {error ? (
          <Text className="text-red-400 text-xs text-center mt-2 px-4">
            {error}
          </Text>
        ) : null}
      </BottomSheetScrollView>
    </View>
  );
}
