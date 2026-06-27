import React from 'react';
import { View, Text, Pressable, Image, Switch } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { LogOut, Eye, Trash2, Edit3 } from 'lucide-react-native';
import { useRoomStore, useAuthStore, useAlertStore, useMapStore } from '@/store';
import { useRouter } from 'expo-router';
import { memberInitial, isLocationActive } from '@/utils/room.utils';
import { useLivenessTick } from '@/hooks/useLivenessTick';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function InRoomActiveSheet() {
  const user = useAuthStore((s) => s.user);
  const showAlert = useAlertStore((s) => s.showAlert);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Re-render on a timer so member liveness (dot, label, sharing count) reflects
  // staleness over time — a disconnected member's row greys out at the 25s
  // threshold instead of freezing on its last value.
  useLivenessTick();

  const {
    room,
    members,
    locations,
    isSharingEnabled,
    toggleSharingEnabled,
    actionLoading,
    leaveRoom,
    updateDestination,
  } = useRoomStore();

  const handleLeaveRoom = () => {
    showAlert('Leave room?', 'Are you sure you want to leave this room?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveRoom();
          } catch (err) {
            console.error('Error leaving room:', err);
          }
        },
      },
    ]);
  };

  const isBusy = actionLoading;
  const roomName = room?.name || 'Room';
  const roomCode = room?.roomCode || '';

  const sharingCount = members.reduce((acc, m) => {
    const isSelf = m.id === user?.id;
    if (isSelf) {
      return acc + (isSharingEnabled ? 1 : 0);
    }
    const loc = locations[m.id];
    return acc + (loc && isLocationActive(loc.updatedAt) ? 1 : 0);
  }, 0);

  return (
    <View style={{ flex: 1, paddingTop: 8, overflow: 'hidden' }}>
      {/* Header (Naturally 120px height) */}
      <View className="px-6 pt-6 pb-6 mb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-white text-xl font-bold" numberOfLines={1}>
              {roomName}
            </Text>
            <Text className="text-muted text-xs mt-1.5">
              {members.length} member{members.length === 1 ? '' : 's'} · {sharingCount} sharing live
            </Text>
          </View>

          <View className="px-3 py-1 bg-secondary rounded-full border border-border">
            <Text className="text-primary font-mono text-[11px] font-semibold tracking-wider">
              {roomCode}
            </Text>
          </View>
        </View>
      </View>

      {/* Members List */}
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 8 }}
        style={{ flex: 1 }}
      >
        {/* Destination Section */}
        {room?.destination ? (
          <View className="mb-6 p-4 bg-[#1e1e1e] border border-border rounded-2xl flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider mb-1">
                Destination
              </Text>
              <Text className="text-white text-sm font-semibold mb-0.5" numberOfLines={1}>
                {room.destination.name}
              </Text>
              <Text className="text-zinc-500 text-xs" numberOfLines={1}>
                {room.destination.formattedAddress}
              </Text>
            </View>
            <View className="flex-row items-center gap-x-2">
              <Pressable
                onPress={() => useMapStore.getState().focusCoords(room.destination!.lat, room.destination!.lng)}
                className="w-9 h-9 bg-secondary rounded-full items-center justify-center border border-border active:opacity-75"
                hitSlop={4}
              >
                <Eye color="#a3a3a3" size={16} />
              </Pressable>
              <Pressable
                onPress={() => router.push('/search?mode=active_destination' as any)}
                className="w-9 h-9 bg-secondary rounded-full items-center justify-center border border-border active:opacity-75"
                hitSlop={4}
              >
                <Edit3 color="#a3a3a3" size={16} />
              </Pressable>
              <Pressable
                onPress={() => {
                  showAlert('Clear Destination?', 'Are you sure you want to clear the room destination?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear',
                      style: 'destructive',
                      onPress: () => {
                        void updateDestination(null);
                      },
                    },
                  ]);
                }}
                className="w-9 h-9 bg-secondary rounded-full items-center justify-center border border-border active:opacity-75"
                hitSlop={4}
              >
                <Trash2 color="#ef4444" size={16} />
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="mb-6 p-4 bg-[#1e1e1e] border border-border border-dashed rounded-2xl flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider mb-1">
                Destination
              </Text>
              <Text className="text-zinc-500 text-sm italic">
                No destination set
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/search?mode=active_destination' as any)}
              className="px-4 h-8 bg-secondary border border-border rounded-xl items-center justify-center active:opacity-75"
            >
              <Text className="text-primary font-semibold text-xs">Set</Text>
            </Pressable>
          </View>
        )}

        <Text className="text-muted text-[10px] font-semibold uppercase tracking-wider mb-3">
          Members in Room
        </Text>

        <View className="gap-y-4">
          {members.map((member) => {
            const isSelf = member.id === user?.id;
            const displayName = member.name || 'Member';

            let isLive = false;
            if (isSelf) {
              isLive = isSharingEnabled;
            } else {
              const loc = locations[member.id];
              isLive = isLocationActive(loc?.updatedAt);
            }

            return (
              <View key={member.id} className="flex-row items-center justify-between">
                {/* Avatar and Name */}
                <View className="flex-row items-center flex-1">
                  <View className="w-[34px] h-[34px] rounded-full bg-secondary border border-border items-center justify-center overflow-hidden mr-3 relative">
                    {member.picture ? (
                      <Image source={{ uri: member.picture }} className="w-full h-full" />
                    ) : (
                      <Text className="text-muted font-bold text-xs">
                        {memberInitial(displayName)}
                      </Text>
                    )}
                  </View>

                  <View className="flex-1">
                    <Text className="text-white text-sm font-medium" numberOfLines={1}>
                      {displayName} {isSelf ? '(You)' : ''}
                    </Text>
                    <Text className="text-muted text-[11px]">
                      {isSelf
                        ? (isSharingEnabled ? 'sharing location' : 'sharing off')
                        : (isLive ? 'sharing location' : 'sharing off')
                      }
                    </Text>
                  </View>
                </View>

                {/* Right Column: Toggle for self, Status Dot for others */}
                {isSelf ? (
                  <Switch
                    value={isSharingEnabled}
                    onValueChange={toggleSharingEnabled}
                    trackColor={{ false: '#2c2c2e', true: '#3b82f6' }}
                    thumbColor={isSharingEnabled ? '#ffffff' : '#121212'}
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                  />
                ) : (
                  <View
                    className={`w-2.5 h-2.5 rounded-full mr-2 ${
                      isLive ? 'bg-green-500' : 'bg-zinc-600'
                    }`}
                  />
                )}
              </View>
            );
          })}
        </View>
      </BottomSheetScrollView>

      {/* Leave Room Button */}
      <View className="px-6 pt-4" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <Pressable
          onPress={handleLeaveRoom}
          disabled={isBusy}
          className="w-full bg-[#1e1e1e] h-[46px] rounded-2xl border border-red-500/50 flex-row items-center justify-center active:opacity-85"
        >
          <LogOut size={16} color="#ef4444" className="mr-2" />
          <Text className="text-red-500 font-semibold text-sm">
            Leave room
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
