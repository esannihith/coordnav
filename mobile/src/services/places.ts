import { PlaceData } from '../store/useAppStore';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

export interface AutocompletePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
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
    return data.predictions || [];
  } catch (error) {
    console.error("Autocomplete error:", error);
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
