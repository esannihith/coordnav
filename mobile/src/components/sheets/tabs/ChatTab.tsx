import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Send, MapPin } from 'lucide-react-native';

export function ChatTab() {
  return (
    <View className="flex-1 flex-col pb-4">
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingVertical: 16 }}>
        <View className="bg-secondary/50 self-center px-4 py-1 rounded-full mb-4">
          <Text className="text-muted text-xs">Today</Text>
        </View>

        <View className="mb-4 pr-12">
          <Text className="text-muted text-xs ml-2 mb-1">Sarah</Text>
          <View className="bg-secondary p-3 rounded-2xl rounded-tl-sm self-start">
            <Text className="text-foreground">I'm 5 mins away!</Text>
          </View>
        </View>

        <View className="mb-4 pl-12 items-end">
          <View className="bg-primary p-3 rounded-2xl rounded-tr-sm self-end">
            <Text className="text-white">Awesome, parking is in the back.</Text>
          </View>
        </View>
      </ScrollView>

      <View className="px-4 flex-row items-center">
        <TouchableOpacity className="w-10 h-10 bg-secondary rounded-full items-center justify-center mr-2">
          <MapPin color="#8e8e93" size={20} />
        </TouchableOpacity>
        <TextInput 
          placeholder="Message room..." 
          placeholderTextColor="#8e8e93"
          className="flex-1 bg-secondary text-foreground px-4 py-3 rounded-full border border-border mr-2"
        />
        <TouchableOpacity className="w-10 h-10 bg-primary rounded-full items-center justify-center">
          <Send color="#fff" size={18} className="ml-1" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
