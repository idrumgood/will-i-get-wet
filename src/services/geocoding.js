/**
 * Geocodes a city/location string into latitude and longitude coordinates
 * using the free OpenStreetMap Nominatim API.
 * 
 * @param {string} query - The location to search for (e.g. "Brooklyn, NY")
 * @returns {Promise<{lat: number, lon: number, display_name: string} | null>}
 */
export async function geocodeCity(query) {
  if (!query) return null;

  try {
    // Nominatim requires a user-agent string or defining exactly what we are for fair use.
    // They prefer emails in case of abuse, but for client side a clear query is usually fine
    // However, it's safer to use the standard format.
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        // 'User-Agent': 'WillIGetWet/1.0 (Bicycle Weather Routing App)' // Browsers often block changing User-Agent
      }
    });

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const topResult = data[0];
      return {
        lat: parseFloat(topResult.lat),
        lon: parseFloat(topResult.lon),
        display_name: topResult.display_name
      };
    }

    return null;

  } catch (error) {
    console.error("Error geocoding city:", error);
    throw error;
  }
}
