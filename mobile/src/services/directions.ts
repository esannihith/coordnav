import * as Location from 'expo-location';
import polyline from '@mapbox/polyline';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

export interface RouteInfo {
  id: string;
  duration: string;
  distance: string;
  summary: string;
  points: { lat: number; lng: number }[];
}

export async function getDirections(
  destinationPlaceId: string,
  mode: string = 'driving' // "car" will map to "driving"
): Promise<RouteInfo[]> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permission to access location was denied');
  }

  const location = await Location.getCurrentPositionAsync({});
  const origin = `${location.coords.latitude},${location.coords.longitude}`;

  const travelMode = mode === 'car' ? 'driving' : mode;

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=place_id:${destinationPlaceId}&mode=${travelMode}&alternatives=true&key=${API_KEY}`;
  
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
