import { apiClient } from './http';
import { PlaceAutocompletePrediction, PlaceDetails, PlaceSearchResult } from '../types/places.types';

export const placesService = {
  async autocomplete(input: string, sessionToken?: string): Promise<PlaceAutocompletePrediction[]> {
    const response = await apiClient.get<{ data: { predictions: PlaceAutocompletePrediction[] } }>(
      '/places/autocomplete',
      {
        params: { input, sessionToken },
      }
    );
    return response.data.data.predictions;
  },

  async getPlaceDetails(placeId: string, sessionToken?: string): Promise<PlaceDetails> {
    const response = await apiClient.get<{ data: { place: PlaceDetails } }>(
      `/places/${placeId}`,
      {
        params: { sessionToken },
      }
    );
    return response.data.data.place;
  },

  async search(query: string): Promise<PlaceSearchResult[]> {
    const response = await apiClient.get<{ data: { places: PlaceSearchResult[] } }>(
      '/places/search',
      {
        params: { query },
      }
    );
    return response.data.data.places;
  },
};
