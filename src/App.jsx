import { useState } from 'react';
import SearchForm from './components/SearchForm';
import MapDisplay from './components/MapDisplay';
import { geocodeCity } from './services/geocoding';
import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(null);
  const [routeInfo, setRouteInfo] = useState({ start: null, dest: null, time: null });

  const handleSearch = async ({ start, destination, departureTime }) => {
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
      
      setRouteInfo({ start: startCoords, dest: destCoords, time: departureTime });
      
      // Update map bounds to look at the new start location temporarily until Phase 3 routes it
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
      <SearchForm onSearch={handleSearch} isLoading={isLoading} />
      
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

      <MapDisplay center={mapCenter} zoom={mapZoom} />
    </div>
  );
}

export default App;
