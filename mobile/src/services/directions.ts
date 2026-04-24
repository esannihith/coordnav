import * as Location from 'expo-location';
import polyline from '@mapbox/polyline';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
const ORIGIN_CACHE_TTL_MS = 30_000;

let cachedOrigin: { value: string; atMs: number } | null = null;

export interface RouteInfo {
  id: string;
  duration: string;
  distance: string;
  summary: string;
  points: { lat: number; lng: number }[];
}

async function resolveOrigin(): Promise<string> {
  if (cachedOrigin && Date.now() - cachedOrigin.atMs < ORIGIN_CACHE_TTL_MS) {
    return cachedOrigin.value;
  }

  const permission = await Location.getForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    const requested = await Location.requestForegroundPermissionsAsync();
    if (requested.status !== 'granted') {
      throw new Error('Permission to access location was denied');
    }
  }

  const lastKnown = await Location.getLastKnownPositionAsync({
    maxAge: 45_000,
    requiredAccuracy: 150,
  });

  const current =
    lastKnown ??
    (await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      mayShowUserSettingsDialog: true,
    }));

  const origin = `${current.coords.latitude},${current.coords.longitude}`;
  cachedOrigin = { value: origin, atMs: Date.now() };
  return origin;
}

export async function getDirections(
  destinationPlaceId: string,
  mode: string = 'driving' // "car" will map to "driving"
): Promise<RouteInfo[]> {
  const origin = await resolveOrigin();

  const travelMode = mode === 'car' ? 'driving' : mode;

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=place_id:${encodeURIComponent(destinationPlaceId)}&mode=${travelMode}&alternatives=true&key=${API_KEY}`;
  
  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK') {
    throw new Error(data.error_message || 'Failed to fetch directions');
  }

  return data.routes.map((route: any, index: number) => {
    const leg = route.legs[0];
    
    // polyline.decode returns an array of [latitude, longitude]
    const decodedCoords = polyline.decode(route.overview_polyline.points);
    
    return {
      id: index.toString(),
      duration: leg.duration.text,
      distance: leg.distance.text,
      summary: route.summary || `Route ${index + 1}`,
      points: decodedCoords.map(coord => ({ lat: coord[0], lng: coord[1] })),
    };
  });
}
