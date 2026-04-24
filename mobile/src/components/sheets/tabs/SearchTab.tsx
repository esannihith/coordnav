import React, { useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Keyboard } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Search as SearchIcon, MapPin, Navigation } from 'lucide-react-native';
import { useAppStore } from '../../../store/useAppStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { useRoomStore } from '../../../store/useRoomStore';
import { isMemberStale, RoomMember } from '../../../services/roomService';
import {
  autocompletePlaces,
  getPlaceDetails,
  searchRestaurants,
  AutocompletePrediction,
} from '../../../services/places';

function isRestaurantIntent(query: string): boolean {
  return /\brestaurants?\b/i.test(query);
}

function isNearMentionIntent(query: string): boolean {
  return /\bnear\s+@/i.test(query);
}

function normalizeMemberHandle(name: string): string {
  const compact = name.trim().replace(/\s+/g, '');
  const cleaned = compact.replace(/[^a-zA-Z0-9_.-]/g, '');
  return cleaned || 'member';
}

function normalizeComparable(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function trimWithDoubleDots(text: string, maxLength = 24): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 2)}..`;
}

interface MentionToken {
  startIndex: number;
  endIndex: number;
  term: string;
}

function getActiveMentionToken(input: string): MentionToken | null {
  const atIndex = input.lastIndexOf('@');
  if (atIndex < 0) {
    return null;
  }

  const prevChar = atIndex === 0 ? ' ' : input.charAt(atIndex - 1);
  if (!/\s/.test(prevChar)) {
    return null;
  }

  let endIndex = atIndex + 1;
  while (endIndex < input.length && !/\s/.test(input.charAt(endIndex))) {
    endIndex += 1;
  }

  // Mention token is considered complete once a whitespace follows it (e.g. "@alex ").
  if (endIndex < input.length && /\s/.test(input.charAt(endIndex))) {
    return null;
  }

  return {
    startIndex: atIndex,
    endIndex,
    term: input.slice(atIndex + 1, endIndex),
  };
}

function hasLiveLocation(member: RoomMember | null): boolean {
  if (!member) {
    return false;
  }
  if (!member.isSharing || !member.location) {
    return false;
  }
  return !isMemberStale(member);
}

export function SearchTab() {
  const { 
    setUiState, setActiveTab, setSelectedPlace, 
    searchQuery, setSearchQuery, 
    searchResults, setSearchResults,
    uiState, activeTab
  } = useAppStore();
  const user = useAuthStore((s) => s.user);
  const isInRoom = useRoomStore((s) => s.isInRoom);
  const roomMembers = useRoomStore((s) => s.members);

  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedMentionUid, setSelectedMentionUid] = React.useState<string | null>(null);

  // Track whether user is returning from Place Details (back navigation)
  // vs. opening Search tab fresh (tab switch from Room/Chat/etc.)
  const isReturningFromPlace = useRef(false);
  const prevActiveTab = useRef<string>(activeTab);

  useEffect(() => {
    const prev = prevActiveTab.current;
    prevActiveTab.current = activeTab;

    if (activeTab !== 'Search') {
      // User left the Search tab
      if (activeTab === 'Place') {
        // Navigated into Place Details — mark as "returning" context
        isReturningFromPlace.current = true;
      }
      return;
    }

    // We just landed on Search tab
    if (isReturningFromPlace.current) {
      // Returning from Place Details → keep query + results intact
      isReturningFromPlace.current = false;
    } else if (prev !== 'Search') {
      // Fresh open from a different tab (Room, Chat, People, Nav, etc.) → clear
      setSearchQuery('');
      setSearchResults([]);
      setSelectedMentionUid(null);
    }
  }, [activeTab, setSearchQuery, setSearchResults]);

  const mentionToken = React.useMemo(
    () => (isInRoom ? getActiveMentionToken(searchQuery) : null),
    [searchQuery, isInRoom]
  );

  const selectedMentionMember = React.useMemo(
    () => roomMembers.find((member) => member.uid === selectedMentionUid) ?? null,
    [roomMembers, selectedMentionUid]
  );

  const memberSuggestions = React.useMemo(() => {
    if (!mentionToken || !isInRoom) {
      return [];
    }

    const term = normalizeComparable(mentionToken.term.trim());
    const filtered = roomMembers.filter((member) => {
      if (member.uid === user?.uid) {
        return false;
      }
      if (!term) {
        return true;
      }
      const displayComparable = normalizeComparable(member.displayName);
      const handleComparable = normalizeComparable(normalizeMemberHandle(member.displayName));
      return displayComparable.includes(term) || handleComparable.includes(term);
    });

    return filtered.slice(0, 8);
  }, [mentionToken, isInRoom, roomMembers, user?.uid]);

  useEffect(() => {
    if (!searchQuery.includes('@') || !isInRoom) {
      setSelectedMentionUid(null);
    }
  }, [searchQuery, isInRoom]);

  // Debounced search logic
  useEffect(() => {
    const timerId = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsLoading(true);
        if (isRestaurantIntent(searchQuery)) {
          // Restaurant search is explicit via action row; don't auto-fetch here.
          const currentResults = useAppStore.getState().searchResults as AutocompletePrediction[];
          const hasNonRestaurantResults = currentResults.some((item) => item.source !== 'restaurant');
          if (hasNonRestaurantResults) {
            setSearchResults([]);
          }
          setIsLoading(false);
          return;
        }

        const results = await autocompletePlaces(searchQuery);
        setSearchResults(results);
        setIsLoading(false);
      } else if (searchQuery.length === 0) {
        setSearchResults([]);
      }
    }, 500); // 500ms debounce delay

    return () => clearTimeout(timerId);
  }, [searchQuery, setSearchResults, selectedMentionMember]);

  const handleRestaurantSearchTrigger = useCallback(async () => {
    const needsMemberContext = isNearMentionIntent(searchQuery);
    const mentionMember = selectedMentionMember;

    if (needsMemberContext) {
      if (!mentionMember || !hasLiveLocation(mentionMember)) {
        return;
      }
    }

    setIsLoading(true);
    try {
      const results = await searchRestaurants(searchQuery, {
        near: needsMemberContext ? mentionMember!.location! : undefined,
      });
      setSearchResults(results);
      setSelectedPlace(null);
      setActiveTab('Place');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedMentionMember, setSearchResults, setSelectedPlace, setActiveTab]);

  const handleMentionSelect = useCallback(
    (member: RoomMember) => {
      const activeMention = getActiveMentionToken(searchQuery);
      if (!activeMention) {
        return;
      }

      const handle = normalizeMemberHandle(member.displayName);
      const nextQuery =
        `${searchQuery.slice(0, activeMention.startIndex)}@${handle} ${searchQuery.slice(activeMention.endIndex)}`
          .replace(/\s+/g, ' ')
          .trimStart();

      setSearchQuery(nextQuery);
      setSelectedMentionUid(member.uid);
    },
    [searchQuery, setSearchQuery]
  );

  const handlePlaceClick = async (prediction: AutocompletePrediction) => {
    Keyboard.dismiss();
    setIsLoading(true);
    const details = await getPlaceDetails(prediction.place_id);
    setIsLoading(false);
    
    if (details) {
      setSelectedPlace(details);
      if (uiState === 'InRoom' || uiState === 'InRoomNavigating' || uiState === 'NavigatingSolo') {
        setActiveTab('Place');
      } else {
        setUiState('PlaceSearch');
        setActiveTab('Place');
      }
    } else {
      // Graceful fallback if error occurs
      alert("Could not load place details.");
    }
  };

  const contextualSearchBlocked =
    isRestaurantIntent(searchQuery) &&
    isNearMentionIntent(searchQuery) &&
    !hasLiveLocation(selectedMentionMember);
  const showRestaurantTrigger = isRestaurantIntent(searchQuery) && searchQuery.trim().length >= 2;

  return (
    <View className="flex-1 px-4 pt-2">
      <View className="flex-row items-center bg-secondary px-4 py-3 rounded-xl mb-4 border border-border">
        <SearchIcon color="#8e8e93" size={20} className="mr-2" />
        <BottomSheetTextInput 
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search for a place..." 
          placeholderTextColor="#8e8e93"
          className="flex-1 text-foreground text-base"
        />
        {isLoading && <ActivityIndicator size="small" color="#8e8e93" />}
      </View>

      {mentionToken && isInRoom && (
        <View className="bg-secondary rounded-xl mb-3 border border-border overflow-hidden">
          {memberSuggestions.length === 0 ? (
            <View className="px-3 py-2.5">
              <Text className="text-muted text-xs">No matching members</Text>
            </View>
          ) : (
            memberSuggestions.map((member) => {
              const memberHasLiveLocation = hasLiveLocation(member);
              return (
                <TouchableOpacity
                  key={member.uid}
                  onPress={() => handleMentionSelect(member)}
                  className="px-3 py-2.5 border-b border-border/60"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-foreground text-sm flex-1 mr-2">
                      @{trimWithDoubleDots(member.displayName)}
                    </Text>
                    <Text className={`text-[11px] ${memberHasLiveLocation ? 'text-green-400' : 'text-muted'}`}>
                      {memberHasLiveLocation ? 'Live' : 'Not sharing'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      {contextualSearchBlocked && (
        <View className="mb-3 px-1">
          <Text className="text-muted text-xs">
            Select a room member with active live location for `near @member` search.
          </Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {showRestaurantTrigger && (
          <TouchableOpacity
            disabled={contextualSearchBlocked || isLoading}
            onPress={() => {
              void handleRestaurantSearchTrigger();
            }}
            className={`mb-3 px-4 py-3 rounded-xl border ${
              contextualSearchBlocked || isLoading
                ? 'bg-secondary/40 border-border/60'
                : 'bg-primary/15 border-primary/40'
            }`}
          >
            <Text className={`font-semibold ${contextualSearchBlocked ? 'text-muted' : 'text-primary'}`}>
              {isNearMentionIntent(searchQuery)
                ? `Search restaurants near @${selectedMentionMember?.displayName || 'member'}`
                : 'Search restaurants near me'}
            </Text>
            <Text className="text-xs text-muted mt-0.5">
              Tap to run restaurant search.
            </Text>
          </TouchableOpacity>
        )}

        {searchResults.length === 0 &&
          searchQuery.length > 0 &&
          !isLoading &&
          !contextualSearchBlocked &&
          !showRestaurantTrigger && (
          <Text className="text-muted text-center mt-4">No results found.</Text>
        )}
        
        {searchResults.length === 0 && searchQuery.length === 0 && (
          <Text className="text-muted text-sm mt-2 mb-3 font-medium uppercase tracking-wider text-center pt-8">
            Type to search locations
          </Text>
        )}

        {searchResults.map((item: AutocompletePrediction) => (
          <TouchableOpacity 
            key={item.place_id}
            onPress={() => handlePlaceClick(item)}
            className="flex-row items-center py-4 border-b border-border"
          >
            <View className="w-10 h-10 bg-secondary rounded-full items-center justify-center mr-4">
              <MapPin color="#8e8e93" size={20} />
            </View>
            <View className="flex-1">
              <Text className="text-foreground font-semibold text-lg">{item.structured_formatting.main_text}</Text>
              <Text className="text-muted text-sm">{item.structured_formatting.secondary_text}</Text>
            </View>
            <View className="w-8 h-8 rounded-full bg-primary/20 items-center justify-center">
              <Navigation color="#3b82f6" size={16} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
