import { Dimensions } from 'react-native';

const WORLD_DIM = 256;

function latRad(lat: number): number {
  const sin = Math.sin((lat * Math.PI) / 180);
  const radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
  return Math.max(Math.min(radX2, Math.PI), -Math.PI) / 2;
}

export function calculateBoundsCamera(points: { lat: number; lng: number }[]) {
  if (!points.length) return null;

  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;

  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }

  // Single point or degenerate route — skip zoom math entirely
  if (minLat === maxLat || minLng === maxLng) {
    return { target: { lat: minLat, lng: minLng }, zoom: 15 };
  }

  const latFraction = (latRad(maxLat) - latRad(minLat)) / Math.PI;
  const lngFraction = (maxLng - minLng) / 360; // always positive: minLng < maxLng guaranteed above

  // Guard: fractions must be positive and finite before log2
  if (!(latFraction > 0) || !(lngFraction > 0)) {
    return { target: { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 }, zoom: 15 };
  }

  const { width, height } = Dimensions.get('window');
  const paddingPx = 60;
  const availW = width - paddingPx * 2;
  const availH = height - paddingPx * 2;

  // Guard: available dimensions must be positive
  if (availW <= 0 || availH <= 0) {
    return { target: { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 }, zoom: 12 };
  }

  const latZoom = Math.log2(availH / WORLD_DIM / latFraction);
  const lngZoom = Math.log2(availW / WORLD_DIM / lngFraction);
  const zoom = Math.min(latZoom, lngZoom, 21) - 0.2;

  // Final NaN/Infinity guard before handing to SDK
  if (!isFinite(zoom)) {
    return { target: { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 }, zoom: 12 };
  }

  return {
    target: { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 },
    zoom,
  };
}