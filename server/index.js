import process from 'node:process';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Weather fetching helper
async function getIntervalWeather(lat, lon, date) {
  try {
    const dateStr = date.toISOString().split('T')[0];
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability,weather_code,is_day&temperature_unit=fahrenheit&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.warn("Failed to fetch weather for point:", lat, lon);
      return null;
    }

    const data = await response.json();
    if (!data || !data.hourly) return null;

    const targetHour = new Date(date);
    targetHour.setMinutes(0, 0, 0);

    let matchedIndex = -1;
    let minDiff = Infinity;

    data.hourly.time.forEach((timeStr, index) => {
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

function getWeatherDescription(code) {
  if (code === 0) return { desc: "Clear", icon: "☀️" };
  if (code >= 1 && code <= 3) return { desc: "Cloudy", icon: "☁️" };
  if (code >= 45 && code <= 48) return { desc: "Fog", icon: "🌫️" };
  if (code >= 51 && code <= 67) return { desc: "Rain", icon: "🌧️" };
  if (code >= 71 && code <= 77) return { desc: "Snow", icon: "❄️" };
  if (code >= 80 && code <= 82) return { desc: "Showers", icon: "🌦️" };
  if (code >= 95 && code <= 99) return { desc: "Thunderstorm", icon: "⛈️" };
  return { desc: "Unknown", icon: "❓" };
}

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const port = process.env.PORT || 3001;

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../dist')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/route', async (req, res) => {
  if (!GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({ error: 'GOOGLE_MAPS_API_KEY is not configured on the server.' });
  }

  const { start, destination, departureTime, transportMode, options } = req.body;

  if (!start || !destination) {
    return res.status(400).json({ error: 'Start and destination are required' });
  }

  try {
    console.log(`Routing from ${start} to ${destination} using mode ${transportMode}`);

    // Map transport mode to Google Maps Routes API mode
    let mode = 'BICYCLE';
    if (transportMode === 'driving') mode = 'DRIVE';
    if (transportMode === 'foot') mode = 'WALK';

    // Prepare avoidance options for Routes API
    const routeModifiers = {};
    if (options?.avoidTolls) routeModifiers.avoidTolls = true;
    if (options?.avoidFerries) routeModifiers.avoidFerries = true;
    if (options?.avoidHighways && transportMode === 'driving') routeModifiers.avoidHighways = true;

    // 1. Get Directions using the new Routes API
    // Need to format origin and destination for Routes API
    // Since we just have address strings, we use the `address` modifier
    const requestBody = {
      origin: { address: start },
      destination: { address: destination },
      travelMode: mode,
      routingPreference: mode === 'DRIVE' ? 'TRAFFIC_AWARE' : undefined,
      routeModifiers: Object.keys(routeModifiers).length > 0 ? routeModifiers : undefined,
      departureTime: departureTime ? new Date(departureTime).toISOString() : new Date().toISOString()
    };

    const routesResponse = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        // Field mask to specify which data we want back to save bandwidth and compute
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.startLocation,routes.legs.endLocation,routes.viewport'
      },
      body: JSON.stringify(requestBody)
    });

    const directionsData = await routesResponse.json();

    if (!routesResponse.ok) {
      console.error('Routes API Error:', directionsData);
      throw new Error(directionsData.error?.message || 'Routes API Error');
    }

    const route = directionsData.routes?.[0];
    if (!route) {
      return res.status(404).json({ error: 'No route found' });
    }

    const leg = route.legs?.[0];

    const startCoords = leg?.startLocation?.latLng ? { lat: leg.startLocation.latLng.latitude, lon: leg.startLocation.latLng.longitude } : null;
    const destCoords = leg?.endLocation?.latLng ? { lat: leg.endLocation.latLng.latitude, lon: leg.endLocation.latLng.longitude } : null;

    const distanceMeters = route.distanceMeters;
    // duration is a string like "123s", parse it to int
    const durationSeconds = parseInt(route.duration?.replace('s', '') || 0, 10);
    const encodedPolyline = route.polyline?.encodedPolyline;
    const viewport = route.viewport; // low and high instead of northeast/southwest

    const stats = {
      distanceMiles: (distanceMeters / 1609.34).toFixed(1),
      durationMins: Math.round(durationSeconds / 60),
      bounds: viewport ? [
        [viewport.high.latitude, viewport.high.longitude],
        [viewport.low.latitude, viewport.low.longitude]
      ] : null
    };

    // 2. Decode polyline to calculate intervals
    // Use an existing library or manually decode the overview_polyline to get coordinates
    // We'll use the geometry encoding from google-maps-services-js
    const decodedPath = decodePath(encodedPolyline);

    // 3. Calculate Intervals
    const depDate = departureTime ? new Date(departureTime) : new Date();
    const intervalMinutes = 30;
    const numIntervals = Math.max(2, Math.floor((durationSeconds / 60) / intervalMinutes) + 1);
    const intervals = [];

    for (let i = 0; i < numIntervals; i++) {
      const percent = numIntervals === 1 ? 0 : i / (numIntervals - 1);
      const coordIndex = Math.min(
        decodedPath.length - 1,
        Math.floor(percent * (decodedPath.length - 1))
      );

      const pt = decodedPath[coordIndex];
      const arrivalSeconds = durationSeconds * percent;
      const arrivalTime = new Date(depDate.getTime() + arrivalSeconds * 1000);

      intervals.push({
        lat: pt.lat,
        lon: pt.lng, // the polyline decoder gives lat, lng
        arrivalTime,
      });
    }

    // 4. Fetch Weather concurrently
    const weatherPromises = intervals.map(async (pt) => {
      const weather = await getIntervalWeather(pt.lat, pt.lon, pt.arrivalTime);
      if (!weather) return null;

      const details = getWeatherDescription(weather.weatherCode);
      return {
        ...pt,
        weather,
        details
      };
    });

    const resolvedWeather = await Promise.all(weatherPromises);
    const weatherPoints = resolvedWeather.filter(w => w !== null);

    res.json({
      startCoords,
      destCoords,
      encodedPolyline,
      stats,
      weatherPoints
    });

  } catch (error) {
    console.error('Error calculating route:', error.response?.data?.error_message || error.message);
    res.status(500).json({ error: error.response?.data?.error_message || 'An error occurred while calculating the route.' });
  }
});

// Polyline decoder function
function decodePath(encodedPath) {
  const len = encodedPath.length;
  let index = 0;
  let lat = 0;
  let lng = 0;
  const path = [];

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encodedPath.charAt(index++).charCodeAt(0) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encodedPath.charAt(index++).charCodeAt(0) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    path.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return path;
}

// Catch-all to serve the React app for non-API routes
// Use middleware to catch requests instead of app.get('*') because Express 5
// (via path-to-regexp v8) dropped support for wildcard routes without named parameters.
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  } else {
    next();
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
