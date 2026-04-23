import { create } from 'zustand';

export type UIState = 
  | 'Home' 
  | 'PlaceSearch' 
  | 'GetDirections' 
  | 'RouteSelection' 
  | 'NavigatingSolo' 
  | 'InRoom' 
  | 'InRoomNavigating';

export type BottomSheetTab = 'Room' | 'Search' | 'Chat' | 'People' | 'Directions' | 'Place';

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

  // Unified State & Tab action
  setUiStateAndTab: (uiState: UIState, activeTab: BottomSheetTab, clearData?: boolean) => void;

  // Mock Data
  roomCode: string | null;
  roomName: string | null;
  joinRoom: (code: string, name?: string) => void;
  leaveRoom: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  uiState: 'Home',
  activeTab: 'Search',
  setUiState: (state) => set({ uiState: state }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  selectedPlace: null,
  setSelectedPlace: (place) => set({ selectedPlace: place }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  searchResults: [],
  setSearchResults: (results) => set({ searchResults: results }),

  travelMode: 'car', // 'car' | 'walking' | 'bicycling' | 'transit'
  setTravelMode: (mode) => set({ travelMode: mode }),
  routes: [],
  setRoutes: (routes) => set({ routes }),
  selectedRouteId: null,
  setSelectedRouteId: (id) => set({ selectedRouteId: id }),

  setUiStateAndTab: (uiState, activeTab, clearData = false) => set((state) => ({ 
    uiState, 
    activeTab,
    ...(clearData ? { selectedPlace: null, routes: [], selectedRouteId: null } : {})
  })),

  roomCode: null,
  roomName: null,
  joinRoom: (code, name) => set({ uiState: 'InRoom', roomCode: code, roomName: name || 'Room', activeTab: 'Chat' }),
  leaveRoom: () => set({ uiState: 'Home', roomCode: null, roomName: null, activeTab: 'Room' }),
}));
