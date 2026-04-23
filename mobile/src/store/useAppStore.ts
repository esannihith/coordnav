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
}

export const MOCK_PLACE_DATA: PlaceData = {
  id: "ChIJF4Yf2Ry7j4AR__1AkytDyAE",
  name: "places/ChIJF4Yf2Ry7j4AR__1AkytDyAE",
  displayName: { text: "Googleplex", languageCode: "en" },
  formattedAddress: "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
  rating: 4.5,
  userRatingCount: 38402,
  types: ["corporate_campus", "point_of_interest", "establishment"]
};

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

  selectedPlace: MOCK_PLACE_DATA,
  setSelectedPlace: (place) => set({ selectedPlace: place }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  searchResults: [],
  setSearchResults: (results) => set({ searchResults: results }),

  roomCode: null,
  roomName: null,
  joinRoom: (code, name) => set({ uiState: 'InRoom', roomCode: code, roomName: name || 'Room', activeTab: 'Chat' }),
  leaveRoom: () => set({ uiState: 'Home', roomCode: null, roomName: null, activeTab: 'Room' }),
}));
