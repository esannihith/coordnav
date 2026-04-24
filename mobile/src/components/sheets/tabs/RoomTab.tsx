import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { ChevronLeft, LogIn, Plus, User, XCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../store/useAuthStore';
import { useRoomStore } from '../../../store/useRoomStore';
import { isMemberStale, normalizeRoomCode } from '../../../services/roomService';

function formatRelative(updatedAtMs: number | null): string {
  if (!updatedAtMs) return 'never';

  const deltaSeconds = Math.max(1, Math.floor((Date.now() - updatedAtMs) / 1000));
  if (deltaSeconds < 60) return `${deltaSeconds}s ago`;

  const deltaMinutes = Math.floor(deltaSeconds / 60);
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`;

  const deltaHours = Math.floor(deltaMinutes / 60);
  return `${deltaHours}h ago`;
}

function memberInitial(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

export function RoomTab() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const {
    currentRoomCode,
    currentRoomName,
    ownerUid,
    isInRoom,
    isOwner,
    members,
    isSharing,
    shareIntentOn,
    shareStatus,
    actionState,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    endRoom,
    toggleSharing,
    setError,
  } = useRoomStore();

  const [isCreating, setIsCreating] = useState(false);
  const [createRoomName, setCreateRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const isBusy = actionState !== 'idle';

  const sharingStatusText = useMemo(() => {
    if (shareStatus === 'starting') return 'Starting live sharing...';
    if (shareStatus === 'paused') return 'Sharing paused in background';
    if (shareStatus === 'error') return 'Could not share location';
    if (isSharing) return 'Sharing live location';
    return 'Sharing is off';
  }, [isSharing, shareStatus]);

  useEffect(() => {
    return () => {
      setError(null);
    };
  }, [setError]);

  const handleLeaveRoom = () => {
    Alert.alert('Leave room?', 'You will stop sharing and leave this room.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await leaveRoom();
            } catch {}
          })();
        },
      },
    ]);
  };

  const handleEndRoom = () => {
    Alert.alert('End room for everyone?', 'This will remove the room for all participants.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Room',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await endRoom();
            } catch {}
          })();
        },
      },
    ]);
  };

  const handleCreateRoom = async () => {
    try {
      await createRoom(createRoomName);
      setIsCreating(false);
      setCreateRoomName('');
    } catch {
      // Store already exposes friendly error text.
    }
  };

  const handleJoinRoom = async () => {
    try {
      await joinRoom(joinCode);
      setJoinCode('');
    } catch {
      // Store already exposes friendly error text.
    }
  };

  const toggleShare = () => {
    void toggleSharing(!shareIntentOn);
  };

  if (!user) {
    return (
      <View className="flex-1 px-4 pt-4">
        <View className="bg-secondary/40 rounded-2xl p-5 border border-border">
          <Text className="text-foreground text-lg font-bold mb-2">Sign in required</Text>
          <Text className="text-muted text-sm mb-4">
            Use Google Sign-In to create or join rooms and share live location.
          </Text>
          <TouchableOpacity
            className="bg-primary py-3 rounded-xl items-center"
            onPress={() => router.push('/profile')}
          >
            <Text className="text-white font-semibold">Open Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isInRoom && currentRoomCode) {
    return (
      <View className="flex-1 px-4 pt-2">
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="bg-secondary/50 rounded-2xl p-4 mb-4 border border-border">
            <View className="flex-row items-start justify-between mb-3">
              <View className="flex-1 pr-3">
                <Text className="text-muted text-xs font-bold uppercase tracking-wider mb-1">Active Room</Text>
                <Text className="text-foreground text-xl font-bold">{currentRoomName || 'Room'}</Text>
              </View>

              <View className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30">
                <Text className="text-primary font-mono text-xs tracking-widest">{currentRoomCode}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={toggleShare}
              disabled={isBusy || shareStatus === 'starting'}
              className={`rounded-xl border px-3 py-3 ${shareIntentOn ? 'bg-green-500/10 border-green-500/30' : 'bg-secondary border-border'}`}
            >
              <View className="flex-row items-center justify-between">
                <Text className={`font-semibold ${shareIntentOn ? 'text-green-400' : 'text-muted'}`}>
                  {shareIntentOn ? 'Live Sharing ON' : 'Live Sharing OFF'}
                </Text>
                {shareStatus === 'starting' && <ActivityIndicator size="small" color="#22c55e" />}
              </View>
              <Text className="text-xs text-muted mt-1">{sharingStatusText}</Text>
            </TouchableOpacity>

            <View className="flex-row mt-3 gap-2">
              <TouchableOpacity
                onPress={handleLeaveRoom}
                disabled={isBusy}
                className="flex-1 bg-secondary border border-border py-3 rounded-xl items-center"
              >
                <Text className="text-foreground font-semibold">Leave Room</Text>
              </TouchableOpacity>

              {isOwner && (
                <TouchableOpacity
                  onPress={handleEndRoom}
                  disabled={isBusy}
                  className="flex-1 bg-red-500/15 border border-red-500/30 py-3 rounded-xl items-center"
                >
                  <Text className="text-red-400 font-semibold">End Room</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View className="mb-3 px-1 flex-row items-center justify-between">
            <Text className="text-muted text-xs font-bold uppercase tracking-widest">
              People in Room ({members.length})
            </Text>
            {isBusy && <ActivityIndicator size="small" color="#3b82f6" />}
          </View>

          {members.map((member) => {
            const isSelf = member.uid === user.uid;
            const stale = isMemberStale(member);

            let status = member.isSharing ? 'Live location on' : 'Sharing paused';
            if (member.isSharing && stale) {
              status = 'Offline (stale update)';
            }

            return (
              <View key={member.uid} className="flex-row items-center py-3 border-b border-border/50">
                <View className="relative mr-3">
                  <View className="w-11 h-11 rounded-full bg-secondary border border-border items-center justify-center overflow-hidden">
                    {member.photoURL ? (
                      <Image source={{ uri: member.photoURL }} className="w-full h-full" />
                    ) : (
                      <Text className="text-foreground font-bold text-sm">{memberInitial(member.displayName)}</Text>
                    )}
                  </View>
                  <View
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-background ${
                      member.isSharing && !stale ? 'bg-green-500' : 'bg-zinc-500'
                    }`}
                  />
                </View>

                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-foreground font-semibold text-base">{member.displayName}</Text>
                    {isSelf && <Text className="text-xs text-primary ml-2">You</Text>}
                    {member.uid === ownerUid && (
                      <Text className="text-xs text-amber-400 ml-2">Owner</Text>
                    )}
                  </View>
                  <Text className="text-muted text-xs">{status}</Text>
                  <Text className="text-muted text-[11px] mt-0.5">Last update: {formatRelative(member.updatedAtMs)}</Text>
                </View>
              </View>
            );
          })}

          {members.length === 0 && (
            <View className="bg-secondary/20 rounded-xl p-4 border border-border">
              <Text className="text-muted text-sm">No members found yet.</Text>
            </View>
          )}
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

  if (isCreating) {
    return (
      <View className="flex-1 px-4 pt-2">
        <View className="flex-row items-center mb-6">
          <TouchableOpacity onPress={() => setIsCreating(false)} className="mr-3 p-1" disabled={isBusy}>
            <ChevronLeft color="#8e8e93" size={24} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-foreground">Create Room</Text>
        </View>

        <Text className="text-muted text-xs font-bold uppercase tracking-wider mb-2">Room Name</Text>
        <BottomSheetTextInput
          value={createRoomName}
          onChangeText={setCreateRoomName}
          editable={!isBusy}
          placeholder="e.g. Friday Meetup"
          placeholderTextColor="#8e8e93"
          className="bg-secondary text-foreground px-4 py-3 rounded-xl border border-border text-base mb-4"
        />

        <TouchableOpacity
          onPress={handleCreateRoom}
          disabled={isBusy}
          className="bg-primary py-4 rounded-xl items-center justify-center mt-auto mb-4"
          style={{ opacity: isBusy ? 0.6 : 1 }}
        >
          {actionState === 'creating' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg">Create & Join</Text>
          )}
        </TouchableOpacity>

        {error && (
          <Text className="text-red-300 text-xs mb-3 text-center">{error}</Text>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1 px-4 pt-4">
      <TouchableOpacity
        onPress={() => {
          setError(null);
          setIsCreating(true);
        }}
        disabled={isBusy}
        className="bg-primary py-4 rounded-xl items-center flex-row justify-center mb-4"
        style={{ opacity: isBusy ? 0.6 : 1 }}
      >
        <Plus color="#fff" size={20} className="mr-2" />
        <Text className="text-white font-bold text-lg">Create New Room</Text>
      </TouchableOpacity>

      <View className="bg-secondary rounded-xl p-4 border border-border">
        <Text className="text-muted text-sm mb-2 font-medium uppercase tracking-wider">Join Existing</Text>
        <View className="flex-row items-center">
          <BottomSheetTextInput
            value={joinCode}
            onChangeText={(value) => setJoinCode(normalizeRoomCode(value))}
            editable={!isBusy}
            placeholder="Room Code"
            placeholderTextColor="#8e8e93"
            maxLength={6}
            autoCapitalize="characters"
            className="flex-1 bg-background text-foreground px-4 py-3 rounded-lg border border-border font-mono text-lg uppercase mr-2"
          />

          <TouchableOpacity
            onPress={handleJoinRoom}
            disabled={isBusy || joinCode.length !== 6}
            className="bg-primary w-12 h-12 rounded-lg items-center justify-center"
            style={{ opacity: isBusy || joinCode.length !== 6 ? 0.5 : 1 }}
          >
            {actionState === 'joining' ? <ActivityIndicator color="#fff" /> : <LogIn color="#fff" size={20} />}
          </TouchableOpacity>
        </View>
      </View>

      <View className="mt-6 bg-secondary/25 rounded-xl border border-border p-4">
        <View className="flex-row items-center mb-2">
          <User color="#8e8e93" size={16} />
          <Text className="text-muted ml-2 text-xs uppercase tracking-wider">How rooms work</Text>
        </View>
        <Text className="text-muted text-xs leading-5">
          Create a room, share the code, chat with your group, and broadcast live location on the same map.
        </Text>
      </View>

      {error && (
        <View className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 flex-row items-center">
          <XCircle color="#f87171" size={14} />
          <Text className="text-red-300 text-xs ml-2 flex-1">{error}</Text>
        </View>
      )}
    </View>
  );
}
