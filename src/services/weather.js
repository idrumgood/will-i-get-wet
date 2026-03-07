/**
 * Fetches the specific hourly weather forecast for an exact location and time.
 * Uses the free Open-Meteo API.
 * 
 * @param {number} lat Latitude
 * @param {number} lon Longitude
 * @param {Date} date The time the rider will be at this location
 * @returns {Promise<{
 *   tempF: number,
 *   precipitationProb: number,
 *   weatherCode: number,
 *   isDay: boolean
 * } | null>}
 */
export async function getIntervalWeather(lat, lon, date) {
  try {
    // Open-Meteo expects ISO8601 strings but only the date part for hourly requests,
    // so we provide start/end dates covering the required time.
    const dateStr = date.toISOString().split('T')[0];
    
    // We want hourly data: temperature, precipitation probability, weather code (for icons), and day/night.
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability,weather_code,is_day&temperature_unit=fahrenheit&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.warn("Failed to fetch weather for point:", lat, lon);
      return null;
    }

    const data = await response.json();
    if (!data || !data.hourly) return null;

    // We need to find the specific hour that matches our arrival time
    // Open-Meteo hourly.time is an array of strings like "YYYY-MM-DDTHH:00"
    
    // Normalize our target date to the start of its hour strings
    const targetHour = new Date(date);
    targetHour.setMinutes(0, 0, 0); 
    
    // Because of timezones, the easiest way is checking absolute timestamps diff
    const targetTimeMs = targetHour.getTime();

    let matchedIndex = -1;
    let minDiff = Infinity;

    data.hourly.time.forEach((timeStr, index) => {
      // The API returns local time string but no offset.
      // However we requested `timezone=auto` so it's returning the time in the timezone of the coordinates.
      const ms = new Date(`${timeStr}:00Z`).getTime(); // This is a rough approx, standardizing to parse cleanly.
      
      // Let's just find the closest hour array index based on pure string parsing ignoring timezone complexites for the MVP
      // Open meteo format: "2026-03-06T14:00"
      // Our date ISO format: "2026-03-06T14:30:00.000Z"
      const apiDateObj = new Date(timeStr); 
      const diff = Math.abs(apiDateObj.getTime() - date.getTime());
      
      if (diff < minDiff) {
        minDiff = diff;
        matchedIndex = index;
      }
    });

    if (matchedIndex === -1) return null;

    return {
      tempF: data.hourly.temperature_2m[matchedIndex],
      precipitationProb: data.hourly.precipitation_probability[matchedIndex],
      weatherCode: data.hourly.weather_code[matchedIndex],
      isDay: data.hourly.is_day[matchedIndex] === 1
    };

  } catch (err) {
    console.error("Weather fetch failed:", err);
    return null;
  }
}

/**
 * Maps Open-Meteo weather codes to human readable descriptive states and emojis.
 * See: https://open-meteo.com/en/docs
 */
export function getWeatherDescription(code) {
  if (code === 0) return { desc: "Clear", icon: "☀️" };
  if (code >= 1 && code <= 3) return { desc: "Cloudy", icon: "☁️" };
  if (code >= 45 && code <= 48) return { desc: "Fog", icon: "🌫️" };
  if (code >= 51 && code <= 67) return { desc: "Rain", icon: "🌧️" };
  if (code >= 71 && code <= 77) return { desc: "Snow", icon: "❄️" };
  if (code >= 80 && code <= 82) return { desc: "Showers", icon: "🌦️" };
  if (code >= 95 && code <= 99) return { desc: "Thunderstorm", icon: "⛈️" };
  return { desc: "Unknown", icon: "❓" };
}

/**
 * Determines if a weather code indicates bad weather (rain, snow, showers, thunderstorms).
 */
export function isBadWeather(code) {
  // 51-67: Rain
  // 71-77: Snow
  // 80-82: Showers
  // 95-99: Thunderstorm
  return (code >= 51 && code <= 67) || 
         (code >= 71 && code <= 77) || 
         (code >= 80 && code <= 82) || 
         (code >= 95 && code <= 99);
}
