/**
 * Pinned Location Configuration
 *
 * Reads a static "current location" from environment variables.
 * Used by kiosk deployments to establish a fixed position for
 * location-aware features like directions and nearby search.
 */

/**
 * A static location pinned via environment variables.
 */
export interface PinnedLocation {
  lat: number;
  lng: number;
  floorId: string;
  pinTitle: string;
}

/**
 * Reads `VITE_PINNED_LATITUDE`, `VITE_PINNED_LONGITUDE`,
 * `VITE_PINNED_FLOOR_ID`, and `VITE_PINNED_TITLE` from `import.meta.env`.
 *
 * @returns A `PinnedLocation` object if all required env vars are set, or `null` otherwise.
 */
export function getPinnedLocation(): PinnedLocation | null {
  const latStr = import.meta.env.VITE_PINNED_LATITUDE;
  const lngStr = import.meta.env.VITE_PINNED_LONGITUDE;
  const floorId = import.meta.env.VITE_PINNED_FLOOR_ID;
  const pinTitle = import.meta.env.VITE_PINNED_TITLE;

  if (!latStr || !lngStr || !floorId) {
    return null;
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng)) {
    return null;
  }

  return {
    lat,
    lng,
    floorId,
    pinTitle: pinTitle || "You Are Here",
  };
}
