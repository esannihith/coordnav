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

const NAV_READY_TIMEOUT_MS = 3_500;
const NAV_READY_POLL_MS = 125;

type NavigationControllerLike = NavigationController & {
  isInitialized?: () => Promise<boolean> | boolean;
  setOnNavigationReady?: (listener: (() => void) | null) => void;
  isGuidanceRunning?: () => Promise<boolean> | boolean;
  stopGuidance?: () => Promise<void>;
  clearDestinations?: () => Promise<void>;
  cleanup?: () => Promise<void>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isNavigatorInitialized(controller: NavigationControllerLike): Promise<boolean> {
  if (typeof controller.isInitialized !== 'function') {
    return true;
  }

  try {
    return Boolean(await controller.isInitialized());
  } catch {
    return false;
  }
}

export async function waitForNavigatorReady(
  navigationController: NavigationController,
  timeoutMs = NAV_READY_TIMEOUT_MS
): Promise<boolean> {
  const controller = navigationController as NavigationControllerLike;
  if (await isNavigatorInitialized(controller)) {
    return true;
  }

  if (typeof controller.setOnNavigationReady === 'function') {
    return new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (ready: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        try {
          controller.setOnNavigationReady?.(null);
        } catch {
          // Ignore cleanup errors.
        }
        resolve(ready);
      };

      const timeout = setTimeout(() => finish(false), timeoutMs);

      try {
        controller.setOnNavigationReady(() => finish(true));
      } catch {
        finish(false);
      }
    });
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isNavigatorInitialized(controller)) {
      return true;
    }
    await sleep(NAV_READY_POLL_MS);
  }

  return false;
}

async function readGuidanceState(controller: NavigationControllerLike): Promise<boolean> {
  if (typeof controller.isGuidanceRunning !== 'function') {
    return false;
  }

  try {
    return Boolean(await controller.isGuidanceRunning());
  } catch {
    return false;
  }
}

async function safeNavCall(label: string, fn: (() => Promise<void>) | undefined): Promise<void> {
  if (!fn) {
    return;
  }

  try {
    await fn();
  } catch (error) {
    console.warn(`[NavService] ${label} failed:`, error);
  }
}

export async function isNativeGuidanceRunning(
  navigationController: NavigationController
): Promise<boolean> {
  const ready = await waitForNavigatorReady(navigationController, 1_500);
  if (!ready) {
    return false;
  }

  return readGuidanceState(navigationController as NavigationControllerLike);
}

/**
 * Initialize the navigation session.
 * Handles Terms & Conditions dialog + SDK init.
 * Returns true if session is ready.
 */
export async function initNavSession(
  navigationController: NavigationController
): Promise<boolean> {
  try {
    const navigatorReady = await waitForNavigatorReady(navigationController);
    if (!navigatorReady) {
      console.warn('[NavService] Navigator not ready; init skipped');
      return false;
    }

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
  const navigatorReady = await waitForNavigatorReady(navigationController);
  if (!navigatorReady) {
    return 'NO_ROUTE_FOUND' as RouteStatus;
  }

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
  await resetNativeNavigationSession(navigationController);
}

/**
 * Defensive reset used on startup/resume and explicit nav exits.
 * Waits for navigator readiness before issuing commands.
 */
export async function resetNativeNavigationSession(
  navigationController: NavigationController
): Promise<void> {
  const controller = navigationController as NavigationControllerLike;
  const ready = await waitForNavigatorReady(navigationController);

  if (!ready) {
    console.log('[NavService] Skip reset: navigator not ready yet');
    return;
  }

  const guidanceRunning = await readGuidanceState(controller);
  if (guidanceRunning) {
    await safeNavCall('stopGuidance', controller.stopGuidance?.bind(controller));
  }

  await safeNavCall('clearDestinations', controller.clearDestinations?.bind(controller));
  console.log('[NavService] Navigation session reset');
}
