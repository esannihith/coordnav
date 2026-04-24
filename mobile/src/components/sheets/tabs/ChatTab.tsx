import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Send, MapPin } from 'lucide-react-native';
import { useAuthStore } from '../../../store/useAuthStore';
import { useRoomStore } from '../../../store/useRoomStore';

function formatMessageTime(createdAtMs: number): string {
  const date = new Date(createdAtMs);
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${minutes} ${ampm}`;
}

function initial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

export function ChatTab() {
  const user = useAuthStore((s) => s.user);
  const isInRoom = useRoomStore((s) => s.isInRoom);
  const messages = useRoomStore((s) => s.messages);
  const chatError = useRoomStore((s) => s.chatError);
  const isSendingMessage = useRoomStore((s) => s.isSendingMessage);
  const sendChatText = useRoomStore((s) => s.sendChatText);

  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const canSend = useMemo(
    () => isInRoom && text.trim().length > 0 && !isSendingMessage,
    [isInRoom, text, isSendingMessage]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 10);

    return () => clearTimeout(timer);
  }, [messages.length]);

  const handleSend = async () => {
    const draft = text.trim();
    if (!draft) {
      return;
    }

    const sent = await sendChatText(draft);
    if (sent) {
      setText('');
    }
  };

  if (!isInRoom) {
    return (
      <View className="flex-1 px-4 pt-4">
        <View className="bg-secondary/40 rounded-2xl p-4 border border-border">
          <Text className="text-foreground font-semibold mb-1">Room chat is available in active rooms.</Text>
          <Text className="text-muted text-sm">Join or create a room to send messages.</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 flex-col pb-4">
      <ScrollView ref={scrollRef} className="flex-1 px-4" contentContainerStyle={{ paddingVertical: 16 }}>
        {messages.length === 0 && (
          <View className="bg-secondary/35 self-center px-4 py-2 rounded-full mb-4">
            <Text className="text-muted text-xs">No messages yet. Say hi.</Text>
          </View>
        )}

        {messages.map((message) => {
          const isSelf = user?.uid === message.senderUid;
          const bubbleWrap = isSelf ? 'items-end pl-12' : 'items-start pr-12';
          const bubbleColor = isSelf ? 'bg-primary rounded-tr-sm' : 'bg-secondary rounded-tl-sm';
          const textColor = isSelf ? 'text-white' : 'text-foreground';
          const timeColor = isSelf ? 'text-white/70' : 'text-muted';

          return (
            <View key={message.id} className={`mb-4 ${bubbleWrap}`}>
              {!isSelf && (
                <View className="flex-row items-center mb-1 ml-1">
                  <View className="w-5 h-5 rounded-full bg-secondary border border-border items-center justify-center mr-1.5">
                    <Text className="text-[10px] text-muted font-semibold">
                      {initial(message.senderName)}
                    </Text>
                  </View>
                  <Text className="text-muted text-xs">{message.senderName}</Text>
                </View>
              )}

              <View className={`p-3 rounded-2xl self-start max-w-full ${bubbleColor}`}>
                {message.type === 'place' && message.place ? (
                  <View className="min-w-52">
                    <View className="flex-row items-center mb-1">
                      <MapPin color={isSelf ? '#ffffff' : '#60a5fa'} size={14} />
                      <Text className={`ml-1.5 font-semibold ${textColor}`}>Shared a place</Text>
                    </View>
                    <Text className={`${textColor} font-semibold`} numberOfLines={2}>
                      {message.place.name}
                    </Text>
                    <Text className={`${isSelf ? 'text-white/80' : 'text-muted'} text-xs mt-0.5`} numberOfLines={3}>
                      {message.place.address}
                    </Text>
                  </View>
                ) : (
                  <Text className={textColor}>{message.text || ''}</Text>
                )}

                <Text className={`${timeColor} text-[11px] mt-1`}>
                  {formatMessageTime(message.createdAtMs)}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View className="px-4 flex-row items-center">
        <BottomSheetTextInput
          value={text}
          onChangeText={setText}
          editable={Boolean(user) && isInRoom && !isSendingMessage}
          placeholder="Message room..."
          placeholderTextColor="#8e8e93"
          className="flex-1 bg-secondary text-foreground px-4 py-3 rounded-full border border-border mr-2"
        />
        <TouchableOpacity
          className="w-10 h-10 bg-primary rounded-full items-center justify-center"
          disabled={!canSend}
          onPress={() => {
            void handleSend();
          }}
          style={{ opacity: canSend ? 1 : 0.5 }}
        >
          <Send color="#fff" size={18} className="ml-1" />
        </TouchableOpacity>
      </View>

      {chatError && (
        <View className="px-4 mt-2">
          <Text className="text-red-300 text-xs">{chatError}</Text>
        </View>
      )}
    </View>
  );
}
