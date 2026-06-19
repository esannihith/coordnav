import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image, Switch } from 'react-native';
import { XCircle, MapPin } from 'lucide-react-native';
import { useRoomStore } from '@/store/room.store';
import { useAuthStore } from '@/store/auth.store';
import { useAlertStore } from '@/store/alert.store';
import { memberInitial } from '@/utils/room.utils';

export function RoomActiveView() {
  const user = useAuthStore((s) => s.user);
  const showAlert = useAlertStore((s) => s.showAlert);

  const {
    room,
    members,
    actionLoading,
    error,
    leaveRoom,
  } = useRoomStore();

  const isBusy = actionLoading;
  const currentRoomCode = room?.roomCode;
  const currentRoomName = room?.name;

  const handleLeaveRoom = () => {
    showAlert(
      'Leave room?',
      'You will leave this room.',
      [
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
      ]
    );
  };

  return (
    <View className="flex-1 px-4 pt-2">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header strip: room name, member count, code pill */}
        <View className="flex-row items-start justify-between mb-4">
          <View className="flex-1 pr-3">
            <Text className="text-foreground text-xl font-bold" numberOfLines={1}>
              {currentRoomName || 'Room'}
            </Text>
            <Text className="text-muted text-xs mt-0.5">
              {members.length} member{members.length === 1 ? '' : 's'}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <View className="px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30">
              <Text className="text-primary font-mono text-xs tracking-widest">{currentRoomCode}</Text>
            </View>
          </View>
        </View>

        {/* Live Location Sharing Row (Disabled with preview message) */}
        <View className="rounded-2xl px-4 py-3.5 border flex-row items-center justify-between mb-3 bg-secondary border-border">
          <View className="flex-row items-center flex-1 pr-3">
            <View className="w-2 h-2 rounded-full mr-2.5 bg-zinc-500" />
            <View className="flex-1">
              <Text className="font-semibold text-muted">
                Live Location Sharing
              </Text>
              <Text className="text-xs text-muted mt-0.5">
                Location sharing is off · preview coming soon
              </Text>
            </View>
          </View>
          <Switch
            value={false}
            disabled
            trackColor={{ false: '#3f3f46', true: '#166534' }}
            thumbColor="#a1a1aa"
          />
        </View>

        {/* Destination card (Static placeholder) */}
        <View className="bg-secondary rounded-2xl px-4 py-3.5 border border-border mb-3">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <MapPin color="#8e8e93" size={16} className="mr-1.5" />
              <Text className="text-muted text-xs font-bold uppercase tracking-wider">Destination</Text>
            </View>
          </View>
          <Text className="text-muted text-sm italic mt-1">No destination set.</Text>
        </View>

        {/* Members list */}
        <View className="mb-1 px-1 flex-row items-center justify-between">
          <Text className="text-muted text-xs font-bold uppercase tracking-widest">People in Room</Text>
          {isBusy && <ActivityIndicator size="small" color="#3b82f6" />}
        </View>

        {members.map((member) => {
          const isSelf = member.id === user?.id;
          const displayName = member.name || 'Member';

          return (
            <View key={member.id} className="flex-row items-center py-3 border-b border-border/50">
              <View className="relative mr-3">
                <View className="w-10 h-10 rounded-full bg-secondary border border-border items-center justify-center overflow-hidden">
                  {member.picture ? (
                    <Image source={{ uri: member.picture }} className="w-full h-full" />
                  ) : (
                    <Text className="text-foreground font-bold text-sm">
                      {memberInitial(displayName)}
                    </Text>
                  )}
                </View>
                <View className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-background bg-zinc-500" />
              </View>

              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-foreground font-semibold text-[15px]" numberOfLines={1}>
                    {displayName}
                    {isSelf ? ' · You' : ''}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}

        {members.length === 0 && (
          <View className="bg-secondary/20 rounded-xl p-4 border border-border">
            <Text className="text-muted text-sm">No members found yet.</Text>
          </View>
        )}

        {/* Leave Room button */}
        <TouchableOpacity
          onPress={handleLeaveRoom}
          disabled={isBusy}
          className="bg-[#2d0f0f]/30 border border-rose-950 py-3.5 rounded-2xl items-center mt-6 mb-4"
        >
          <Text className="text-rose-500 font-semibold text-sm">Leave Room</Text>
        </TouchableOpacity>
      </ScrollView>

      {error && (
        <View className="absolute bottom-3 left-4 right-4 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 flex-row items-center">
          <XCircle color="#f87171" size={16} />
          <Text className="text-red-300 text-xs ml-2 flex-1">{error}</Text>
        </View>
      )}
    </View>
  );
}
