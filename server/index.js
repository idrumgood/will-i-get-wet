import process from 'node:process';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Client } from '@googlemaps/google-maps-services-js';

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

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Initialize Google Maps client
const client = new Client({});
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

app.use(cors());
app.use(express.json());

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

    // Map transport mode to Google Maps mode
    let mode = 'BICYCLING';
    if (transportMode === 'driving') mode = 'DRIVING';
    if (transportMode === 'foot') mode = 'WALKING';

    // Prepare avoidance options
    const avoid = [];
    if (options?.avoidTolls) avoid.push('tolls');
    if (options?.avoidFerries) avoid.push('ferries');
    if (options?.avoidHighways && transportMode === 'driving') avoid.push('highways');

    // 1. Get Directions from Google Maps
    const directionsResponse = await client.directions({
      params: {
        origin: start,
        destination: destination,
        mode: mode,
        avoid: avoid.length > 0 ? avoid : undefined,
        departure_time: departureTime ? new Date(departureTime) : new Date(),
        key: GOOGLE_MAPS_API_KEY
      }
    });

    const route = directionsResponse.data.routes[0];
    if (!route || !route.legs || route.legs.length === 0) {
      return res.status(404).json({ error: 'No route found' });
    }

    const leg = route.legs[0];

    const startCoords = { lat: leg.start_location.lat, lon: leg.start_location.lng };
    const destCoords = { lat: leg.end_location.lat, lon: leg.end_location.lng };

    const distanceMeters = leg.distance.value;
    const durationSeconds = leg.duration.value;
    const encodedPolyline = route.overview_polyline.points;
    const bounds = route.bounds;

    const stats = {
      distanceMiles: (distanceMeters / 1609.34).toFixed(1),
      durationMins: Math.round(durationSeconds / 60),
      bounds: [
        [bounds.northeast.lat, bounds.northeast.lng],
        [bounds.southwest.lat, bounds.southwest.lng]
      ]
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

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
