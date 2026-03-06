/**
 * Fetches a bicycle route between two coordinates using the OSRM public API.
 * 
 * @param {{lat: number, lon: number}} start 
 * @param {{lat: number, lon: number}} end 
 * @returns {Promise<{
 *   geometry: { coordinates: [number, number][] }, 
 *   distance: number, 
 *   duration: number,
 *   legs: any[]
 * } | null>}
 */
export async function getBicycleRoute(start, end) {
  if (!start || !end) return null;

  try {
    // OSRM expects coordinates in Longitude,Latitude format
    const startStr = `${start.lon},${start.lat}`;
    const endStr = `${end.lon},${end.lat}`;
    
    // Using the bicycle profile, requesting full geometry in GeoJSON format
    const url = `https://router.project-osrm.org/route/v1/bicycle/${startStr};${endStr}?overview=full&geometries=geojson`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`OSRM Routing failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error("No route found between these locations.");
    }

    const route = data.routes[0];
    
    // distance is in meters, duration in seconds
    return {
      geometry: route.geometry, // GeoJSON LineString
      distance: route.distance,
      duration: route.duration,
      legs: route.legs
    };

  } catch (error) {
    console.error("Error fetching bicycle route:", error);
    throw error;
  }
}
