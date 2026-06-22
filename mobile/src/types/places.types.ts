export interface PlaceAutocompletePrediction {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

export interface PlaceDetails {
  place_id: string;
  name?: string;
  types?: string[];
  formatted_address?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  business_status?: string;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  website?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface PlaceSearchResult {
  place_id: string;
  name?: string;
  formatted_address?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}
