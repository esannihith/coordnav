import { create } from 'zustand';

export type UIState = 
  | 'Home' 
  | 'PlaceSearch' 
  | 'GetDirections' 
  | 'RouteSelection' 
  | 'NavigatingSolo' 
  | 'InRoom' 
  | 'InRoomNavigating'
  | 'InRoomGetDirections';

export type BottomSheetTab = 'Room' | 'Search' | 'Chat' | 'Directions' | 'Place' | 'Nav';

export interface PlaceData {
  id: string;
  name: string;
  displayName: { text: string; languageCode: string };
  formattedAddress: string;
  rating: number;
  userRatingCount: number;
  types: string[];
  location?: { lat: number; lng: number };
}

interface AppState {
  uiState: UIState;
  activeTab: BottomSheetTab;
  setUiState: (state: UIState) => void;
  setActiveTab: (tab: BottomSheetTab) => void;
  
  selectedPlace: PlaceData | null;
  setSelectedPlace: (place: PlaceData | null) => void;
  
  destination: PlaceData | null;
  setDestination: (place: PlaceData | null) => void;

  // Search State
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: any[]; // Specifically AutocompletePrediction[]
  setSearchResults: (results: any[]) => void;

  // Directions State
  travelMode: string;
  setTravelMode: (mode: string) => void;
  routes: any[]; // RouteInfo[]
  setRoutes: (routes: any[]) => void;
  selectedRouteId: string | null;
  setSelectedRouteId: (id: string | null) => void;

  // Navigation session state
  isNavSessionActive: boolean;
  setNavSessionActive: (active: boolean) => void;

  // Room State
  roomCode: string | null;
  roomName: string | null;
  roomDestination: string | null;
  joinRoom: (code: string, name?: string) => void;
  leaveRoom: () => void;
  setRoomDestination: (dest: string | null) => void;

  // Unified State & Tab action
  setUiStateAndTab: (uiState: UIState, activeTab: BottomSheetTab, clearData?: boolean) => void;

  // Stop navigation — clears nav data and transitions state
  stopNav: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  uiState: 'Home',
  activeTab: 'Search',
  setUiState: (state) => set({ uiState: state }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  selectedPlace: null,
  setSelectedPlace: (place) => set({ selectedPlace: place }),

  destination: null,
  setDestination: (place) => set({ destination: place }),

  isNavSessionActive: false,
  setNavSessionActive: (active) => set({ isNavSessionActive: active }),

  roomCode: null,
  roomName: null,
  roomDestination: null,
  joinRoom: (code, name) => set({ uiState: 'InRoom', roomCode: code, roomName: name || 'Room', activeTab: 'Room' }),
  leaveRoom: () => set({ uiState: 'Home', roomCode: null, roomName: null, roomDestination: null, activeTab: 'Search' }),
  setRoomDestination: (dest) => set({ roomDestination: dest }),

  setUiStateAndTab: (uiState, activeTab, clearData = false) => set((state) => ({ 
    uiState, 
    activeTab,
    ...(clearData ? { selectedPlace: null, destination: null, routes: [], selectedRouteId: null, searchQuery: '', searchResults: [] } : {})
  })),

  stopNav: () => {
    const { roomCode } = get();
    set({
      isNavSessionActive: false,
      destination: null,
      routes: [],
      selectedRouteId: null,
      selectedPlace: null,
      searchQuery: '',
      searchResults: [],
      uiState: roomCode ? 'InRoom' : 'Home',
      activeTab: roomCode ? 'Room' : 'Search',
    });
  },

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  searchResults: [],
  setSearchResults: (results) => set({ searchResults: results }),

  travelMode: 'car',
  setTravelMode: (mode) => set({ travelMode: mode }),
  routes: [],
  setRoutes: (routes) => set({ routes }),
  selectedRouteId: null,
  setSelectedRouteId: (id) => set({ selectedRouteId: id }),
}));
