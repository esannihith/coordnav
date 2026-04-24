import {
  type NavigationController,
  type RouteStatus,
  NavigationSessionStatus,
  TravelMode,
} from '@googlemaps/react-native-navigation-sdk';
import type { PlaceData } from '../store/useAppStore';

/**
 * Map our app's travel mode strings to SDK TravelMode enum.
 */
const TRAVEL_MODE_MAP: Record<string, TravelMode> = {
  car: TravelMode.DRIVING,
  walking: TravelMode.WALKING,
  bicycling: TravelMode.CYCLING,
  transit: TravelMode.DRIVING, // SDK has no transit; fall back to driving
};

/**
 * Initialize the navigation session.
 * Handles Terms & Conditions dialog + SDK init.
 * Returns true if session is ready.
 */
export async function initNavSession(
  navigationController: NavigationController
): Promise<boolean> {
  try {
    console.log('[NavService] Requesting Terms & Conditions dialog...');
    const termsAccepted =
      await navigationController.showTermsAndConditionsDialog();
    console.log('[NavService] Terms accepted:', termsAccepted);
    
    if (!termsAccepted) {
      console.warn('[NavService] User declined terms');
      return false;
    }

    console.log('[NavService] Initializing navigation session...');
    const status = await navigationController.init();
    console.log('[NavService] Init status:', status);

    if (status === NavigationSessionStatus.OK) {
      console.log('[NavService] Session initialized successfully');
      return true;
    }

    const statusStrings: Record<string, string> = {
      [NavigationSessionStatus.OK]: 'Ok',
      [NavigationSessionStatus.NOT_AUTHORIZED]: 'NOT_AUTHORIZED (Check API Key)',
      [NavigationSessionStatus.TERMS_NOT_ACCEPTED]: 'TERMS_NOT_ACCEPTED',
      [NavigationSessionStatus.NETWORK_ERROR]: 'NETWORK_ERROR',
      [NavigationSessionStatus.LOCATION_PERMISSION_MISSING]: 'LOCATION_PERMISSION_MISSING',
      [NavigationSessionStatus.UNKNOWN_ERROR]: 'UNKNOWN_ERROR',
    };

    console.error('[NavService] Init failed with status:', statusStrings[status as string] || status);
    return false;
  } catch (error) {
    console.error('[NavService] Init exception:', error);
    return false;
  }
}

/**
 * Set destination and start guidance.
 * Uses the place's Google Place ID when available, falls back to lat/lng.
 */
export async function startNavigation(
  navigationController: NavigationController,
  destination: PlaceData,
  travelMode: string = 'car'
): Promise<RouteStatus> {
  const waypoint: { placeId?: string; title?: string; position?: { lat: number; lng: number } } = {
    title: destination.displayName?.text || destination.name,
  };

  // Prefer placeId for accurate routing; fall back to coordinates
  if (destination.id) {
    waypoint.placeId = destination.id;
  } else if (destination.location) {
    waypoint.position = {
      lat: destination.location.lat,
      lng: destination.location.lng,
    };
  }

  const sdkTravelMode = TRAVEL_MODE_MAP[travelMode] ?? TravelMode.DRIVING;

  const routeStatus = await navigationController.setDestination(waypoint, {
    routingOptions: {
      travelMode: sdkTravelMode,
      avoidFerries: false,
      avoidTolls: false,
    },
    displayOptions: {
      showDestinationMarkers: true,
    },
  });

  if (routeStatus === 'OK') {
    await navigationController.startGuidance();
    console.log('[NavService] Guidance started');
  } else {
    console.error('[NavService] Route failed:', routeStatus);
  }

  return routeStatus;
}

/**
 * Stop guidance and clear all destinations.
 */
export async function stopNavigation(
  navigationController: NavigationController
): Promise<void> {
  try {
    await navigationController.stopGuidance();
    await navigationController.clearDestinations();
    console.log('[NavService] Navigation stopped');
  } catch (error) {
    console.error('[NavService] Stop error:', error);
  }
}
