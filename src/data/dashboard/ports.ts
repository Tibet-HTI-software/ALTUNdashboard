/**
 * Geo-coordinates for the ocean-freight ports in the Altun network.
 *
 * Used by the Fleet Tracking globe to plot port markers, draw trade-route
 * arcs, and fly the camera to a vessel's destination.
 */

export interface PortCoord {
  lat: number;
  lng: number;
}

export const PORT_COORDS: Record<string, PortCoord> = {
  Shanghai: { lat: 31.23, lng: 121.47 },
  Ningbo: { lat: 29.87, lng: 121.54 },
  Qingdao: { lat: 36.07, lng: 120.38 },
  Yantian: { lat: 22.56, lng: 114.27 },
  Kaohsiung: { lat: 22.61, lng: 120.28 },
  Busan: { lat: 35.1, lng: 129.04 },
  "Tanjung Pelepas": { lat: 1.36, lng: 103.55 },
  "Laem Chabang": { lat: 13.08, lng: 100.88 },
  Singapore: { lat: 1.26, lng: 103.83 },
  Valencia: { lat: 39.44, lng: -0.32 },
  Cartagena: { lat: 37.6, lng: -0.98 },
  Rotterdam: { lat: 51.95, lng: 4.14 },
  Antwerp: { lat: 51.26, lng: 4.4 },
  "New York": { lat: 40.69, lng: -74.04 },
  // ── Turkish ports (Altun Logistics home network) ──────────────────────────
  "Ambarlı": { lat: 40.98, lng: 28.67 },
  "Istanbul": { lat: 41.01, lng: 28.95 },
  "Izmir": { lat: 38.44, lng: 27.14 },
  "Mersin": { lat: 36.79, lng: 34.63 },
};

/** Looks up a port coordinate by name, defaulting to Rotterdam. */
export function portCoord(name: string): PortCoord {
  return PORT_COORDS[name] ?? PORT_COORDS.Rotterdam;
}
