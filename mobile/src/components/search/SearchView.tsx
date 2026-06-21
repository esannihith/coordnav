import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, TextInput, FlatList } from 'react-native';
import { ChevronLeft, Search, MapPin, Clock, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface RecentSearchItem {
  id: string;
  title: string;
  subtitle: string;
}

const MOCK_RECENTS: RecentSearchItem[] = [
  { id: '1', title: 'Goa International Airport', subtitle: 'Dabolim, Goa' },
  { id: '2', title: 'Baga Beach', subtitle: 'Calangute, Goa' },
  { id: '3', title: 'Panaji Coffee Shop', subtitle: 'Fontainhas, Panaji, Goa' },
  { id: '4', title: 'Margao Railway Station', subtitle: 'Margao, Goa' },
];

export function SearchView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Autofocus input on mount
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const filteredRecents = query.trim()
    ? MOCK_RECENTS.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(query.toLowerCase())
      )
    : MOCK_RECENTS;

  return (
    <View
      className="flex-1 bg-[#030712]"
      style={{ paddingTop: Math.max(insets.top, 16) }}
    >
      {/* Search Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-[#1F2937] gap-x-3">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center active:opacity-70"
          hitSlop={8}
        >
          <ChevronLeft color="#F9FAFB" size={26} />
        </Pressable>

        {/* Input Wrapper */}
        <View className="flex-1 h-11 bg-[#1e1e1e] rounded-xl border border-border px-3 flex-row items-center">
          <Search color="#666666" size={18} className="mr-2" />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search for places..."
            placeholderTextColor="#666666"
            className="text-foreground text-sm flex-1 p-0 h-full"
            style={{ color: '#ffffff' }}
          />
          {query.length > 0 && (
            <Pressable
              onPress={handleClear}
              className="w-6 h-6 items-center justify-center rounded-full bg-zinc-800"
              hitSlop={6}
            >
              <X color="#a3a3a3" size={14} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Recents list */}
      <View className="flex-1 px-4 pt-4">
        <Text className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-4 px-2">
          {query.trim() ? 'Search Results' : 'Recent Searches'}
        </Text>

        {filteredRecents.length === 0 ? (
          <View className="flex-1 items-center justify-center pt-10">
            <MapPin color="#444444" size={40} className="mb-4" />
            <Text className="text-zinc-500 text-sm">No locations found</Text>
          </View>
        ) : (
          <FlatList
            data={filteredRecents}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  console.log('Selected place:', item.title);
                  router.back();
                }}
                className="flex-row items-center py-3.5 px-2 border-b border-[#1F2937]/50 active:opacity-75"
              >
                <View className="w-9 h-9 rounded-full bg-[#1e1e1e] items-center justify-center mr-3 border border-border/50">
                  <Clock color="#a3a3a3" size={16} />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-sm font-semibold mb-0.5" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text className="text-zinc-500 text-xs" numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        )}
      </View>
    </View>
  );
}
