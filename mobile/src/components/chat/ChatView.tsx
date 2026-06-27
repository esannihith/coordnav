import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Send, MapPin } from 'lucide-react-native';
import { useAuthStore, useChatStore, useRoomStore, useMapStore } from '@/store';
import { socketClient } from '@/services';
import { ChatMessage } from '@/types/chat.types';
import { memberInitial } from '@/utils/room.utils';

export function ChatView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState('');

  const user = useAuthStore((s) => s.user);
  const messages = useChatStore((s) => s.messages);
  const room = useRoomStore((s) => s.room);
  const roomName = room?.name ?? 'Chat';

  const handleSendMessage = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    socketClient.sendText(trimmed);
    setInputText('');
  };

  const handleShowPlace = async (placeId: string) => {
    try {
      await useMapStore.getState().selectPlace(placeId);
      // Navigate back to map after selecting place
      router.back();
    } catch (err) {
      console.error('Failed to show place on map:', err);
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isSelf = item.sender.id === user?.id;
    const displayName = item.sender.name || 'Member';

    if (item.kind === 'TEXT') {
      return (
        <View className={`mb-4 flex-row items-start ${isSelf ? 'justify-end' : 'justify-start'}`}>
          {!isSelf && (
            <View className="w-[32px] h-[32px] rounded-full bg-secondary border border-border items-center justify-center overflow-hidden mr-2">
              {item.sender.picture ? (
                <Image source={{ uri: item.sender.picture }} className="w-full h-full" />
              ) : (
                <Text className="text-muted font-bold text-xs">
                  {memberInitial(displayName)}
                </Text>
              )}
            </View>
          )}

          <View className="max-w-[75%]">
            {!isSelf && (
              <Text className="text-muted text-[10px] mb-1 ml-1">{displayName}</Text>
            )}
            <View className={`px-3.5 py-2 rounded-2xl ${
              isSelf ? 'bg-[#3b82f6] rounded-tr-none' : 'bg-secondary rounded-tl-none'
            }`}>
              <Text className={`text-[13px] leading-5 ${isSelf ? 'text-black font-medium' : 'text-white'}`}>
                {item.text}
              </Text>
            </View>
            {isSelf && item.status && item.status !== 'sent' && (
              <Text className="text-right text-[10px] text-muted mt-0.5 mr-1">
                {item.status === 'sending' ? 'sending...' : 'failed'}
              </Text>
            )}
          </View>
        </View>
      );
    }

    if (item.kind === 'PLACE') {
      const place = item.place;
      if (!place) return null;

      return (
        <View className={`mb-4 flex-row items-start ${isSelf ? 'justify-end' : 'justify-start'}`}>
          {!isSelf && (
            <View className="w-[32px] h-[32px] rounded-full bg-secondary border border-border items-center justify-center overflow-hidden mr-2">
              {item.sender.picture ? (
                <Image source={{ uri: item.sender.picture }} className="w-full h-full" />
              ) : (
                <Text className="text-muted font-bold text-xs">
                  {memberInitial(displayName)}
                </Text>
              )}
            </View>
          )}

          <View className="w-full max-w-[280px] bg-secondary/40 border border-border p-3.5 rounded-2xl">
            <Text className="text-muted text-[10px] font-medium mb-2 uppercase tracking-wide">
              {isSelf ? 'Shared by You' : `Shared by ${displayName}`}
            </Text>

            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-background border border-border rounded-xl items-center justify-center mr-3">
                <MapPin color="#3b82f6" size={20} />
              </View>
              <View className="flex-1">
                <Text className="text-white text-xs font-semibold" numberOfLines={1}>
                  {place.name}
                </Text>
                {place.address ? (
                  <Text className="text-muted text-[10px] mt-0.5" numberOfLines={1}>
                    {place.address}
                  </Text>
                ) : null}
              </View>
            </View>

            <View className="flex-row items-center justify-between mt-3.5 w-full">
              <Pressable
                onPress={() => handleShowPlace(place.placeId)}
                className="flex-1 py-1.5 bg-[#2a2a2a] border border-[#3b82f6]/50 rounded-lg mr-2 items-center justify-center active:opacity-85"
              >
                <Text className="text-[#3b82f6] font-semibold text-[11px]">Show on map</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  console.log('Get Directions to:', place.name);
                  // Directions will be implemented in subsequent steps.
                }}
                className="flex-1 py-1.5 bg-[#3b82f6] rounded-lg items-center justify-center active:opacity-85"
              >
                <Text className="text-black font-semibold text-[11px]">Directions</Text>
              </Pressable>
            </View>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1e1e" />

      {/* Header */}
      <View
        style={{
          backgroundColor: '#1e1e1e',
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(56, 56, 58, 0.5)',
          paddingTop: insets.top,
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: '700' }} numberOfLines={1}>
            {roomName}
          </Text>
          <Text style={{ color: '#8e8e93', fontSize: 12, marginTop: 2 }}>Room chat</Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#2c2c2e',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          className="active:opacity-70"
        >
          <X size={18} color="#ffffff" />
        </Pressable>
      </View>

      {/* Messages + Composer wrapped in keyboard-aware container */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Message list */}
        <FlatList
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 8,
          }}
          style={{ flex: 1 }}
        />

        {/* Composer */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#1e1e1e',
            borderTopWidth: 1,
            borderTopColor: 'rgba(56, 56, 58, 0.4)',
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 12),
          }}
        >
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSendMessage}
            placeholder="Message or share a place…"
            placeholderTextColor="#8e8e93"
            returnKeyType="send"
            style={{
              flex: 1,
              backgroundColor: '#2c2c2e',
              color: '#ffffff',
              fontSize: 14,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 20,
              marginRight: 10,
              maxHeight: 100,
            }}
            multiline
          />
          <Pressable
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: inputText.trim() ? '#3b82f6' : '#2c2c2e',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Send size={18} color={inputText.trim() ? '#ffffff' : '#8e8e93'} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
