import React, { useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Keyboard } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Search as SearchIcon, MapPin, Navigation } from 'lucide-react-native';
import { useAppStore } from '../../../store/useAppStore';
import { autocompletePlaces, getPlaceDetails, AutocompletePrediction } from '../../../services/places';

export function SearchTab() {
  const { 
    setUiState, setActiveTab, setSelectedPlace, 
    searchQuery, setSearchQuery, 
    searchResults, setSearchResults,
    uiState, activeTab
  } = useAppStore();

  const [isLoading, setIsLoading] = React.useState(false);

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
    }
  }, [activeTab, setSearchQuery, setSearchResults]);

  // Debounced search logic
  useEffect(() => {
    const timerId = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsLoading(true);
        const results = await autocompletePlaces(searchQuery);
        setSearchResults(results);
        setIsLoading(false);
      } else if (searchQuery.length === 0) {
        setSearchResults([]);
      }
    }, 500); // 500ms debounce delay

    return () => clearTimeout(timerId);
  }, [searchQuery, setSearchResults]);

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

      <ScrollView showsVerticalScrollIndicator={false}>
        {searchResults.length === 0 && searchQuery.length > 0 && !isLoading && (
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
