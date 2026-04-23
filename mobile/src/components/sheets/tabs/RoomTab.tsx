import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Plus, LogIn, ChevronLeft, MapPin } from 'lucide-react-native';
import { useAppStore } from '../../../store/useAppStore';

export function RoomTab() {
  const { joinRoom } = useAppStore();
  const [isCreating, setIsCreating] = useState(false);
  const [createRoomName, setCreateRoomName] = useState('');
  const [createDestination, setCreateDestination] = useState('');

  if (isCreating) {
    return (
      <View key="create-form" className="flex-1 px-4 pt-2">
        <View className="flex-row items-center mb-6">
          <TouchableOpacity onPress={() => setIsCreating(false)} className="mr-3 p-1">
            <ChevronLeft color="#fff" size={24} />
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
