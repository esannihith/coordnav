import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useAppStore, useRoomStore } from '@/store';
import { normalizeRoomCode } from '@/utils/room.utils';
import { useRoomEntry } from '@/hooks/useRoomEntry';

export function HomeSheet() {
  const setUiState = useAppStore((s) => s.setUiState);
  const { joinRoom, actionLoading, error } = useRoomStore();
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const enterRoom = useRoomEntry();

  const handleJoin = async () => {
    if (code.length !== 6 || isSubmitting || actionLoading) return;
    setIsSubmitting(true);
    try {
      await enterRoom(() => joinRoom(code));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = actionLoading || isSubmitting;

  return (
    <View className="flex-1 px-6 pt-4">
      {/* Title */}
      <Text className="text-white text-lg font-semibold mb-6">
        Start a trip
      </Text>

      {/* Create Room Button */}
      <Pressable
        onPress={() => setUiState('CreateRoom')}
        disabled={isBusy}
        className="w-full bg-primary h-[52px] rounded-2xl items-center justify-center mb-6 active:opacity-90"
      >
        <Text className="text-[#121212] font-semibold text-[15px]">
          Create a room
        </Text>
      </Pressable>

      {/* Subtitle */}
      <Text className="text-muted text-center text-xs mb-4">
        or join an existing one
      </Text>

      {/* Join Code Inputs */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="w-[62%] h-[52px] bg-[#1e1e1e] rounded-2xl border border-border px-4 justify-center">
          <BottomSheetTextInput
            value={code}
            onChangeText={(val) => setCode(normalizeRoomCode(val))}
            placeholder="Enter room code"
            placeholderTextColor="#a3a3a3"
            maxLength={6}
            autoCapitalize="characters"
            editable={!isBusy}
            className="text-foreground text-sm flex-1 p-0"
          />
        </View>

        <Pressable
          onPress={handleJoin}
          disabled={isBusy || code.length !== 6}
          className="w-[34%] h-[52px] bg-secondary rounded-2xl items-center justify-center border border-border active:opacity-80"
          style={{ opacity: code.length === 6 && !isBusy ? 1 : 0.6 }}
        >
          {isBusy ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            <Text className="text-primary font-semibold text-[15px]">
              Join
            </Text>
          )}
        </Pressable>
      </View>

      {/* Error Message */}
      {error ? (
        <Text className="text-red-400 text-xs text-center mt-2 px-4">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
