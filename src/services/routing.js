/**
 * Fetches a route between two coordinates using the Valhalla public API.
 * 
 * @param {{lat: number, lon: number}} start 
 * @param {{lat: number, lon: number}} end 
 * @param {string} profile The transport profile to use (driving, bicycle, foot)
 * @param {object} options Optional routing preferences (avoidTolls, avoidFerries, avoidHighways, avoidLocations)
 * @returns {Promise<{
 *   geometry: { coordinates: [number, number][] }, 
 *   distance: number,  // in meters
 *   duration: number,  // in seconds
 *   legs: any[]
 * } | null>}
 */
export async function getRoute(start, end, profile = 'bicycle', options = {}) {
  if (!start || !end) return null;

  try {
    // Map our app's profiles to Valhalla costing models
    const profileMap = {
      driving: 'auto',
      bicycle: 'bicycle',
      foot: 'pedestrian'
    };
    const costingModel = profileMap[profile] || 'bicycle';
    
    const url = `https://valhalla1.openstreetmap.de/route`;
    const payload = {
      locations: [
        { lat: start.lat, lon: start.lon },
        { lat: end.lat, lon: end.lon }
      ],
      costing: costingModel,
      directions_options: { units: 'miles' }
    };

    // Apply rigorous avoidance penalties if requested by the user
    // Note: Valhalla uses a sliding scale 0 (avoid) to 1 (favor)
    if (Object.keys(options).length > 0) {
      payload.costing_options = {
        [costingModel]: {}
      };
      
      if (options.avoidTolls) payload.costing_options[costingModel].use_tolls = 0;
      if (options.avoidFerries) payload.costing_options[costingModel].use_ferry = 0;
      if (options.avoidHighways && costingModel === 'auto') payload.costing_options[costingModel].use_highways = 0;
      
      if (options.avoidLocations && options.avoidLocations.length > 0) {
        payload.exclude_polygons = options.avoidLocations.map(pt => [createAvoidancePolygon(pt.lat, pt.lon, 2)]);
      }
    }

    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Valhalla API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.trip || !data.trip.legs || data.trip.legs.length === 0) {
      throw new Error("No route found from Valhalla API");
    }

    // Valhalla returns distance in km (or miles if requested), we convert to meters to maintain compatibility with our App state
    const distanceMeters = data.trip.summary.length * 1609.34;
    const durationSeconds = data.trip.summary.time;

    // Decode Valhalla polyline to GeoJSON coordinates (lon, lat)
    const coordinates = decodePolyline(data.trip.legs[0].shape).map(p => [p[1], p[0]]);

    return {
      geometry: { coordinates },
      distance: distanceMeters,
      duration: durationSeconds,
      legs: data.trip.legs
    };

  } catch (error) {
    console.error("Error fetching Valhalla route:", error);
    return null;
  }
}

/**
 * Decodes a Valhalla encoded polyline string into an array of [lat, lon] coordinates.
 * Valhalla uses precision 6.
 */
function decodePolyline(str, precision = 6) {
  let index = 0, lat = 0, lng = 0, coordinates = [], shift = 0, result = 0, byte = null, latitude_change, longitude_change, factor = Math.pow(10, precision);
  while (index < str.length) {
    byte = null; shift = 0; result = 0;
    do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20); latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1)); shift = result = 0;
    do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20); longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += latitude_change; lng += longitude_change;
    coordinates.push([lat / factor, lng / factor]);
  }
  return coordinates;
}

/**
 * Creates a roughly square bounding box polygon around a center point.
 * @param {number} lat Center latitude
 * @param {number} lon Center longitude
 * @param {number} radiusMiles Approximate "radius" (actually half width/height) of the box in miles
 * @returns {[number, number][]} Array of [lon, lat] coordinates representing a closed ring
 */
function createAvoidancePolygon(lat, lon, radiusMiles) {
  // 1 degree of latitude is approx 69 miles
  const latOffset = radiusMiles / 69.0;
  // 1 degree of longitude is approx 69 miles * cos(latitude)
  const lonOffset = radiusMiles / (69.0 * Math.cos(lat * Math.PI / 180));

  const northLat = lat + latOffset;
  const southLat = lat - latOffset;
  const eastLon = lon + lonOffset;
  const westLon = lon - lonOffset;

  // Valhalla polygons require a closed ring of [lon, lat] ordered counter-clockwise
  // though generally order doesn't matter for simple exclude polygons as long as it's closed
  return [
    [westLon, northLat], // Top Left
    [westLon, southLat], // Bottom Left
    [eastLon, southLat], // Bottom Right
    [eastLon, northLat], // Top Right
    [westLon, northLat]  // Close the ring (Top Left)
  ];
}
