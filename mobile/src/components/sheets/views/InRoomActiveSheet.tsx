import React from 'react';
import { View, Text, Pressable, Image, Switch } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { LogOut } from 'lucide-react-native';
import { useRoomStore, useAuthStore, useAlertStore } from '@/store';
import { memberInitial, isLocationActive } from '@/utils/room.utils';

export function InRoomActiveSheet() {
  const user = useAuthStore((s) => s.user);
  const showAlert = useAlertStore((s) => s.showAlert);

  const {
    room,
    members,
    locations,
    isSharingEnabled,
    toggleSharingEnabled,
    actionLoading,
    leaveRoom,
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
    <View className="flex-1 px-6 pt-2 flex-col justify-between">
      <BottomSheetScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Room Header Strip */}
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-1 pr-3">
            <Text className="text-white text-[17px] font-bold" numberOfLines={1}>
              {roomName}
            </Text>
            <Text className="text-muted text-xs mt-0.5">
              {members.length} member{members.length === 1 ? '' : 's'} · {sharingCount} sharing live
            </Text>
          </View>

          <View className="px-3 py-1 bg-secondary rounded-full border border-border">
            <Text className="text-primary font-mono text-[11px] font-semibold tracking-wider">
              {roomCode}
            </Text>
          </View>
        </View>

        {/* Section Title */}
        <Text className="text-muted text-[10px] font-semibold uppercase tracking-wider mb-3">
          Members in Room
        </Text>

        {/* Members List */}
        <View className="gap-y-4">
          {members.map((member) => {
            const isSelf = member.id === user?.id;
            const displayName = member.name || 'Member';

            // Self is live if actively sharing location. Others are live if updated within threshold.
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
      <View className="pt-4 pb-6">
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
