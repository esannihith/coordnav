import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { X, MapPin } from 'lucide-react-native';
import { useAppStore, useRoomStore } from '@/store';
import { useRoomEntry } from '@/hooks/useRoomEntry';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function CreateRoomSheet() {
  const setUiState = useAppStore((s) => s.setUiState);
  const { createRoom, actionLoading, error } = useRoomStore();

  const [roomName, setRoomName] = useState('');
  const [destination, setDestination] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const enterRoom = useRoomEntry();
  const insets = useSafeAreaInsets();

  // Local state for interactive mock controls
  const [maxMembers, setMaxMembers] = useState(10);
  const [expiry, setExpiry] = useState<'1h' | '4h' | '24h'>('1h');

  const handleCreate = async () => {
    if (!roomName.trim() || isSubmitting || actionLoading) return;
    setIsSubmitting(true);
    try {
      await enterRoom(() => createRoom(roomName));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = actionLoading || isSubmitting;

  return (
    <View className="flex-1 px-6 pt-2 overflow-hidden" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
      {/* Header (Naturally 120px height) */}
      <View className="pt-6 pb-14">
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

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* Description Text (Falls below the 120px fold) */}
        <Text className="text-muted text-xs mb-6 leading-5">
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
            <Text className="text-[#666666] text-[10px] font-medium italic">
              coming soon
            </Text>
          </View>
        </View>
        <View className="h-10 bg-[#1e1e1e]/50 rounded-xl border border-border/30 px-3.5 flex-row items-center mb-4 opacity-40">
          <MapPin color="#666666" size={16} className="mr-2" />
          <BottomSheetTextInput
            value={destination}
            onChangeText={setDestination}
            placeholder="Add a destination…"
            placeholderTextColor="#444444"
            editable={false}
            className="text-muted text-sm flex-1 p-0"
          />
        </View>

        {/* Room Controls Header */}
        <View className="flex-row items-center gap-x-2 mb-2">
          <Text className="text-white text-xs font-semibold uppercase tracking-wider">
            Room controls
          </Text>
          <Text className="text-[#666666] text-[10px] font-medium italic">
            coming soon
          </Text>
        </View>

        {/* Controls Row */}
        <View className="flex-row justify-between mb-6">
          {/* Max Members Panel */}
          <View className="w-[47%] h-[59px] bg-[#1e1e1e] rounded-xl border border-border px-3 py-2 justify-between">
            <Text className="text-muted text-[10px] uppercase font-semibold">
              Max members
            </Text>
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => setMaxMembers(m => Math.max(1, m - 1))}
                disabled={isBusy}
                className="w-6 h-6 rounded bg-[#121212] items-center justify-center active:opacity-75"
              >
                <Text className="text-white font-bold text-sm">−</Text>
              </Pressable>
              <Text className="text-white font-semibold text-sm">
                {maxMembers}
              </Text>
              <Pressable
                onPress={() => setMaxMembers(m => m + 1)}
                disabled={isBusy}
                className="w-6 h-6 rounded bg-[#121212] items-center justify-center active:opacity-75"
              >
                <Text className="text-white font-bold text-sm">+</Text>
              </Pressable>
            </View>
          </View>

          {/* Expiry Panel */}
          <View className="w-[47%] h-[59px] bg-[#1e1e1e] rounded-xl border border-border px-3 py-2 justify-between">
            <Text className="text-muted text-[10px] uppercase font-semibold">
              Expires in
            </Text>
            <View className="flex-row items-center justify-between">
              {(['1h', '4h', '24h'] as const).map((opt) => {
                const active = expiry === opt;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => setExpiry(opt)}
                    disabled={isBusy}
                    className={`px-2 py-0.5 rounded ${active ? 'bg-primary' : 'bg-transparent'}`}
                  >
                    <Text className={`text-[11px] font-semibold ${active ? 'text-[#121212]' : 'text-muted'}`}>
                      {opt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

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
      </ScrollView>
    </View>
  );
}
