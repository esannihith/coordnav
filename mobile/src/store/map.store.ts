import { create } from 'zustand';
import { PlaceDetails } from '../types/places.types';
import { placesService } from '../services/places.service';

export type MapState =
  | { kind: 'IDLE' }
  | { kind: 'PREVIEW_PLACE'; place: PlaceDetails }
  | { kind: 'PREVIEW_ROUTE'; polyline: string; place: PlaceDetails };

interface MapStore {
  state: MapState;
  isLoading: boolean;
  error: string | null;
  focusedCoords: { lat: number; lng: number; timestamp: number } | null;
  selectPlace: (placeId: string, sessionToken?: string) => Promise<void>;
  setPreviewRoute: (polyline: string, place: PlaceDetails) => void;
  focusCoords: (lat: number, lng: number) => void;
  clear: () => void;
}

export const useMapStore = create<MapStore>((set) => ({
  state: { kind: 'IDLE' },
  isLoading: false,
  error: null,
  focusedCoords: null,
  selectPlace: async (placeId, sessionToken) => {
    set({ isLoading: true, error: null });
    try {
      const place = await placesService.getPlaceDetails(placeId, sessionToken);
      set({
        state: { kind: 'PREVIEW_PLACE', place },
        isLoading: false,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.response?.data?.message ?? err.message ?? 'Failed to load place details',
      });
    }
  },
  setPreviewRoute: (polyline, place) => {
    set({
      state: { kind: 'PREVIEW_ROUTE', polyline, place },
    });
  },
  focusCoords: (lat, lng) => {
    set({ focusedCoords: { lat, lng, timestamp: Date.now() } });
  },
  clear: () => {
    set({
      state: { kind: 'IDLE' },
      error: null,
      focusedCoords: null,
    });
  },
}));
