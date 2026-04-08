import { useState } from 'react';
import SearchForm from './components/SearchForm';
import MapDisplay from './components/MapDisplay';
import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [routeInfo, setRouteInfo] = useState({ start: null, dest: null, time: null, mode: 'bicycle' });
  const [routeGeometry, setRouteGeometry] = useState(null);
  const [weatherPoints, setWeatherPoints] = useState([]);
  const [routeStats, setRouteStats] = useState(null);

  const handleSearch = async ({ start, destination, departureTime, transportMode, options }) => {
    setIsLoading(true);
    setError(null);
    setWeatherPoints([]);
    setRouteStats(null);
    setRouteGeometry(null);

    try {
      const response = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start,
          destination,
          departureTime,
          transportMode,
          options
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch route');
      }

      setRouteInfo({ start: data.startCoords, dest: data.destCoords, time: departureTime, mode: transportMode });
      setRouteGeometry(data.encodedPolyline);
      setRouteStats(data.stats);
      setWeatherPoints(data.weatherPoints);
      
      // We will let the MapDisplay fit bounds using the bounds from the backend
      setMapCenter(null);
      
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
        encodedPolyline={routeGeometry}
        bounds={routeStats?.bounds}
        weatherPoints={weatherPoints} 
      />
    </div>
  );
}

export default App;
