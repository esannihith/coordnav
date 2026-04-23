import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Navigation, Phone, User } from 'lucide-react-native';

export function PeopleTab() {
  const people = [
    { name: 'Sarah Miller', status: 'Driving • 5 min away', isSelf: false },
    { name: 'Alex Chen', status: 'Parked', isSelf: false },
    { name: 'You', status: 'Sharing location', isSelf: true },
  ];

  return (
    <View className="flex-1 px-4 pt-2">
      <ScrollView showsVerticalScrollIndicator={false}>
        {people.map((person, i) => (
          <View key={i} className="flex-row items-center py-4 border-b border-border">
            <View className="w-12 h-12 bg-secondary rounded-full items-center justify-center mr-4 border border-border">
              <User color="#8e8e93" size={24} />
            </View>
            <View className="flex-1">
              <Text className="text-foreground font-semibold text-lg">{person.name}</Text>
              <Text className="text-muted text-sm">{person.status}</Text>
            </View>
            {!person.isSelf && (
              <View className="flex-row">
                <TouchableOpacity className="w-10 h-10 rounded-full bg-secondary items-center justify-center mr-2">
                  <Phone color="#8e8e93" size={18} />
                </TouchableOpacity>
                <TouchableOpacity className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center">
                  <Navigation color="#3b82f6" size={18} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
