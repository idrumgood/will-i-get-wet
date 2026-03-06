import { useState } from 'react';
import SearchForm from './components/SearchForm';
import MapDisplay from './components/MapDisplay';
import { geocodeCity } from './services/geocoding';
import { getRoute } from './services/routing';
import { calculateWeatherIntervals } from './services/intervals';
import { getIntervalWeather, getWeatherDescription } from './services/weather';
import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(null);
  const [routeInfo, setRouteInfo] = useState({ start: null, dest: null, time: null, mode: 'bicycle' });
  const [routeGeometry, setRouteGeometry] = useState(null);
  const [weatherPoints, setWeatherPoints] = useState([]);
  const [routeStats, setRouteStats] = useState(null);

  const handleSearch = async ({ start, destination, departureTime, transportMode, options }) => {
    setIsLoading(true);
    setError(null);

    try {
      // Phase 2: Geocoding the cities
      console.log(`Geocoding ${start} and ${destination}...`);
      const startCoords = await geocodeCity(start);
      const destCoords = await geocodeCity(destination);

      if (!startCoords || !destCoords) {
        throw new Error("Could not find coordinates for one or both locations.");
      }

      console.log('Start Coordinates:', startCoords);
      console.log('Dest Coordinates:', destCoords);
      console.log('Departure Time:', departureTime);
      console.log('Transport Mode:', transportMode);
      console.log('Options:', options);
      
      setRouteInfo({ start: startCoords, dest: destCoords, time: departureTime, mode: transportMode });
      
      // Phase 3: Fetch Route Data
      console.log(`Fetching ${transportMode} route...`);
      const routeData = await getRoute(startCoords, destCoords, transportMode, options);
      
      if (!routeData) {
        throw new Error(`Could not find a valid ${transportMode} route.`);
      }

      setRouteGeometry(routeData.geometry.coordinates);
      setRouteStats({
        distanceMiles: (routeData.distance / 1609.34).toFixed(1), // OSRM returns meters
        durationMins: Math.round(routeData.duration / 60) // OSRM returns seconds
      });

      // Phase 3: Calculate Intervals & weather
      console.log("Calculating intervals and fetching weather...");
      // Parse the standard HTML datetime-local picker string into a Date object
      const depDate = new Date(departureTime);
      
      const intervalPoints = calculateWeatherIntervals(routeData.geometry.coordinates, routeData.duration, depDate, 30); // Every 30 mins
      
      // Fetch weather concurrently for all points
      const weatherPromises = intervalPoints.map(async (pt) => {
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
      const validWeatherPoints = resolvedWeather.filter(w => w !== null);
      setWeatherPoints(validWeatherPoints);

      // Update map bounds to look at the new start location temporarily
      setMapCenter([startCoords.lat, startCoords.lon]);
      setMapZoom(12);

    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while fetching data.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Left Sidebar Layout */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <SearchForm onSearch={handleSearch} isLoading={isLoading} />
        
        {routeStats && !isLoading && (
          <div className="glass-panel" style={{
            width: '350px',
            padding: '16px',
            display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Est. Distance</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{routeStats.distanceMiles} mi</span>
          </div>
          <div style={{ width: '1px', backgroundColor: 'var(--panel-border)', height: '100%' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>
              Est. {routeInfo.mode === 'bicycle' ? 'Biking' : routeInfo.mode === 'driving' ? 'Driving' : 'Walking'} Time
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {routeStats.durationMins > 60 
                ? `${Math.floor(routeStats.durationMins / 60)}h ${routeStats.durationMins % 60}m` 
                : `${routeStats.durationMins}m`}
            </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="glass-panel" style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          padding: '16px',
          backgroundColor: 'rgba(254, 226, 226, 0.9)',
          color: '#991b1b',
          border: '1px solid #fca5a5',
          zIndex: 1000,
          borderRadius: '8px',
          maxWidth: '300px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <MapDisplay 
        center={mapCenter} 
        zoom={mapZoom} 
        routeGeometry={routeGeometry} 
        weatherPoints={weatherPoints} 
      />
    </div>
  );
}

export default App;
