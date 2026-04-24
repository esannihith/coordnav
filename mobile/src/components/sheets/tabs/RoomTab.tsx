import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Plus, LogIn, ChevronLeft, MapPin, User, Phone, Navigation, LogOut, Copy } from 'lucide-react-native';
import { useAppStore } from '../../../store/useAppStore';

export function RoomTab() {
  const { roomCode, roomName, roomDestination, joinRoom, leaveRoom, setRoomDestination } = useAppStore();
  const [isCreating, setIsCreating] = useState(false);
  const [createRoomName, setCreateRoomName] = useState('');
  const [createDestination, setCreateDestination] = useState('');

  const handleLeaveRoom = () => {
    Alert.alert(
      'Leave Room?',
      'Are you sure you want to leave this room?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => leaveRoom(),
        },
      ]
    );
  };

  // ── In Room State ──
  if (roomCode) {
    // Mock people data - this would normally come from a room provider/hook
    const people = [
      { name: 'Sarah Miller', status: 'Driving • 5 min away', isSelf: false },
      { name: 'Alex Chen', status: 'Parked', isSelf: false },
      { name: 'You', status: 'Sharing location', isSelf: true },
    ];

    return (
      <View className="flex-1 px-4 pt-2">
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Room Header Info */}
          <View className="bg-secondary/50 rounded-2xl p-4 mb-4 border border-border">
            <View className="flex-row justify-between items-start mb-4">
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <Text className="text-muted text-xs font-bold uppercase tracking-widest mr-2">Active Room</Text>
                  <View className="px-1.5 py-0.5 rounded-md bg-green-500/20">
                    <Text className="text-[10px] text-green-400 font-bold uppercase">Live</Text>
                  </View>
                </View>
                <Text className="text-foreground text-xl font-bold">{roomName || 'Our Trip'}</Text>
              </View>
              <TouchableOpacity 
                onPress={handleLeaveRoom}
                className="bg-red-500/10 p-2.5 rounded-xl border border-red-500/20"
              >
                <LogOut color="#ef4444" size={20} />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center bg-background/50 rounded-xl p-3 border border-border/50">
              <View className="flex-1">
                <Text className="text-muted text-[10px] font-bold uppercase mb-0.5">Invite Code</Text>
                <Text className="text-foreground font-mono text-lg tracking-widest">{roomCode}</Text>
              </View>
              <TouchableOpacity className="bg-primary/20 p-2 rounded-lg">
                <Copy color="#3b82f6" size={18} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Room Destination */}
          <View className="mb-6 px-1">
            <Text className="text-muted text-xs font-bold uppercase tracking-widest mb-3">Room Destination</Text>
            {roomDestination ? (
              <View className="bg-primary/10 rounded-2xl p-4 border border-primary/20 flex-row items-center">
                <View className="w-10 h-10 bg-primary/20 rounded-full items-center justify-center mr-4">
                  <MapPin color="#3b82f6" size={20} />
                </View>
                <View className="flex-1">
                  <Text className="text-foreground font-semibold text-base">{roomDestination}</Text>
                  <Text className="text-muted text-xs">Everyone in room can see this</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setRoomDestination(null)}
                  className="p-2"
                >
                  <Text className="text-muted text-xs font-bold">CLEAR</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                onPress={() => setRoomDestination('Grand Central Terminal, NY')}
                className="bg-secondary/30 rounded-2xl p-4 border border-border border-dashed flex-row items-center justify-center"
              >
                <Plus color="#3b82f6" size={18} className="mr-2" />
                <Text className="text-primary font-bold">Set Destination for Group</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* People List */}
          <View className="mb-2">
            <View className="flex-row justify-between items-center mb-2 px-1">
              <Text className="text-muted text-xs font-bold uppercase tracking-widest">People in Room ({people.length})</Text>
            </View>
            {people.map((person, i) => (
              <View key={i} className="flex-row items-center py-4 border-b border-border/50 last:border-b-0">
                <View className="w-12 h-12 bg-secondary rounded-full items-center justify-center mr-4 border border-border">
                  <User color="#8e8e93" size={24} />
                  {person.isSelf && (
                    <View className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#1c1c1e]" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-foreground font-semibold text-base">{person.name}</Text>
                  <Text className="text-muted text-xs">{person.status}</Text>
                </View>
                {!person.isSelf && (
                  <View className="flex-row">
                    <TouchableOpacity className="w-10 h-10 rounded-full bg-secondary items-center justify-center mr-2 border border-border">
                      <Phone color="#8e8e93" size={18} />
                    </TouchableOpacity>
                    <TouchableOpacity className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center border border-primary/20">
                      <Navigation color="#3b82f6" size={18} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Create Room Form ──
  if (isCreating) {
    return (
      <View key="create-form" className="flex-1 px-4 pt-2">
        <View className="flex-row items-center mb-6">
          <TouchableOpacity onPress={() => setIsCreating(false)} className="mr-3 p-1">
            <ChevronLeft color="#8e8e93" size={24} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-foreground">Create Room</Text>
        </View>

        <View className="mb-4">
          <Text className="text-muted text-sm font-medium mb-2 uppercase tracking-wider">Room Name</Text>
          <BottomSheetTextInput
            value={createRoomName}
            onChangeText={setCreateRoomName}
            placeholder="e.g. Vegas Road Trip"
            placeholderTextColor="#8e8e93"
            className="bg-secondary text-foreground px-4 py-3 rounded-xl border border-border text-base"
          />
        </View>

        <View className="mb-6">
          <Text className="text-muted text-sm font-medium mb-2 uppercase tracking-wider">Destination (Optional)</Text>
          <BottomSheetTextInput
            value={createDestination}
            onChangeText={setCreateDestination}
            placeholder="Search destination..."
            placeholderTextColor="#8e8e93"
            className="bg-secondary text-foreground px-4 py-3 rounded-xl border border-border text-base mb-2"
          />
          <TouchableOpacity className="flex-row items-center py-2 self-start px-2">
            <MapPin color="#3b82f6" size={16} className="mr-2" />
            <Text className="text-primary font-medium">Select on map</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => {
            joinRoom('NEW123', createRoomName || 'My Room');
            setIsCreating(false);
            setCreateRoomName('');
            setCreateDestination('');
          }}
          className="bg-primary py-4 rounded-xl items-center justify-center shadow-lg shadow-primary/20 mt-auto mb-4"
        >
          <Text className="text-white font-bold text-lg">Create & Join</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View key="default-form" className="flex-1 px-4 pt-4">
      <TouchableOpacity
        onPress={() => setIsCreating(true)}
        className="bg-primary py-4 rounded-xl items-center flex-row justify-center mb-4 shadow-lg shadow-primary/20"
      >
        <Plus color="#fff" size={20} className="mr-2" />
        <Text className="text-white font-bold text-lg">Create New Room</Text>
      </TouchableOpacity>

      <View className="bg-secondary rounded-xl p-4">
        <Text className="text-muted text-sm mb-2 font-medium uppercase tracking-wider">Join Existing</Text>
        <View className="flex-row items-center">
          <BottomSheetTextInput
            placeholder="Room Code"
            placeholderTextColor="#8e8e93"
            className="flex-1 bg-background text-foreground px-4 py-3 rounded-lg border border-border font-mono text-lg uppercase mr-2"
          />
          <TouchableOpacity
            onPress={() => joinRoom('ABC999')}
            className="bg-primary w-12 h-12 rounded-lg items-center justify-center"
          >
            <LogIn color="#fff" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <Text className="text-muted text-sm mt-6 mb-3 font-medium uppercase tracking-wider">Recent Rooms</Text>
      <TouchableOpacity className="flex-row items-center py-3 border-b border-border">
        <View className="w-10 h-10 bg-secondary rounded-full items-center justify-center mr-3">
          <Text className="text-primary font-bold">#</Text>
        </View>
        <View className="flex-1">
          <Text className="text-foreground font-semibold">NYC Trip</Text>
          <Text className="text-muted text-xs">Ended yesterday • 4 people</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}
