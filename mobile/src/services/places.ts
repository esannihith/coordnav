import { PlaceData } from '../store/useAppStore';
import * as Location from 'expo-location';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
const RESTAURANT_SEARCH_RADIUS_METERS = 5_000;

export interface AutocompletePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  location?: {
    lat: number;
    lng: number;
  };
  source?: 'autocomplete' | 'restaurant';
}

interface LatLngLiteral {
  lat: number;
  lng: number;
}

function normalizeRestaurantKeyword(input: string): string {
  return input
    .replace(/@\S+/g, ' ')
    .replace(/\b(search|find|show|me|for|near|restaurants?|restaurant)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function resolveSearchOrigin(): Promise<LatLngLiteral | null> {
  const permission = await Location.getForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    const requested = await Location.requestForegroundPermissionsAsync();
    if (requested.status !== 'granted') {
      return null;
    }
  }

  const lastKnown = await Location.getLastKnownPositionAsync({
    maxAge: 60_000,
    requiredAccuracy: 200,
  });

  const current =
    lastKnown ??
    (await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      mayShowUserSettingsDialog: true,
    }));

  return {
    lat: current.coords.latitude,
    lng: current.coords.longitude,
  };
}

export async function autocompletePlaces(query: string): Promise<AutocompletePrediction[]> {
  if (!query || query.length < 2) return [];
  if (!API_KEY) {
    console.warn("EXPO_PUBLIC_GOOGLE_PLACES_API_KEY is not defined.");
    return [];
  }
  
  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    return (data.predictions || []).map((prediction: any) => ({
      ...prediction,
      source: 'autocomplete' as const,
    }));
  } catch (error) {
    console.error("Autocomplete error:", error);
    return [];
  }
}

export async function searchRestaurants(
  queryText: string,
  options?: {
    near?: LatLngLiteral | null;
    radiusMeters?: number;
  }
): Promise<AutocompletePrediction[]> {
  if (!API_KEY) {
    console.warn("EXPO_PUBLIC_GOOGLE_PLACES_API_KEY is not defined.");
    return [];
  }

  const near = options?.near ?? (await resolveSearchOrigin());
  if (!near) {
    return [];
  }

  const keyword = normalizeRestaurantKeyword(queryText);
  const radius = options?.radiusMeters ?? RESTAURANT_SEARCH_RADIUS_METERS;
  const params = [
    `location=${near.lat},${near.lng}`,
    `radius=${radius}`,
    `type=restaurant`,
    `key=${API_KEY}`,
  ];
  if (keyword.length > 0) {
    params.push(`keyword=${encodeURIComponent(keyword)}`);
  }

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.join('&')}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Restaurant search error:', data.status, data.error_message);
      return [];
    }

    return (data.results || []).map((result: any) => ({
      place_id: result.place_id,
      description: result.vicinity ? `${result.name}, ${result.vicinity}` : result.name,
      structured_formatting: {
        main_text: result.name || 'Restaurant',
        secondary_text: result.vicinity || result.formatted_address || 'Nearby',
      },
      location: result.geometry?.location
        ? {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
          }
        : undefined,
      source: 'restaurant' as const,
    }));
  } catch (error) {
    console.error('Restaurant search request failed:', error);
    return [];
  }
}

export async function getPlaceDetails(placeId: string): Promise<PlaceData | null> {
  if (!API_KEY) return null;
  
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,rating,user_ratings_total,types,geometry&key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.result) return null;
    
    const details = data.result;
    return {
      id: placeId,
      name: `places/${placeId}`,
      displayName: { text: details.name || 'Unknown Place', languageCode: 'en' },
      formattedAddress: details.formatted_address || '',
      rating: details.rating || 0,
      userRatingCount: details.user_ratings_total || 0,
      types: details.types || [],
      location: details.geometry?.location ? { lat: details.geometry.location.lat, lng: details.geometry.location.lng } : undefined,
    };
  } catch (error) {
    console.error("Place details error:", error);
    return null;
  }
}
