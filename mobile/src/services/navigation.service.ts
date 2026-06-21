import {
  type NavigationController,
  NavigationSessionStatus,
} from '@googlemaps/react-native-navigation-sdk';

/**
 * Initialize the Google Maps Navigation SDK.
 * Checks terms first, presents Terms & Conditions dialog if needed, and initializes the session.
 */
export async function initNavSession(
  navigationController: NavigationController
): Promise<boolean> {
  try {
    console.log('[NavigationService] Checking if terms are already accepted...');
    const accepted = await navigationController.areTermsAccepted();
    console.log('[NavigationService] Terms already accepted:', accepted);

    if (!accepted) {
      console.log('[NavigationService] Requesting Terms & Conditions dialog...');
      const userAccepted = await navigationController.showTermsAndConditionsDialog();
      console.log('[NavigationService] Terms accepted by user:', userAccepted);
      if (!userAccepted) {
        console.warn('[NavigationService] User declined terms');
        return false;
      }
    }

    console.log('[NavigationService] Initializing navigation session...');
    const status = await navigationController.init();
    console.log('[NavigationService] Init status:', status);

    switch (status) {
      case NavigationSessionStatus.OK:
        console.log('[NavigationService] Session initialized successfully');
        return true;
      case NavigationSessionStatus.NOT_AUTHORIZED:
        console.error('[NavigationService] API key not authorized');
        break;
      case NavigationSessionStatus.TERMS_NOT_ACCEPTED:
        console.error('[NavigationService] Terms not accepted');
        break;
      case NavigationSessionStatus.LOCATION_PERMISSION_MISSING:
        console.error('[NavigationService] Location permission required');
        break;
      case NavigationSessionStatus.NETWORK_ERROR:
        console.error('[NavigationService] Network error');
        break;
      default:
        console.error('[NavigationService] Unknown error:', status);
    }
    return false;
  } catch (error) {
    console.error('[NavigationService] Init exception:', error);
    return false;
  }
}
