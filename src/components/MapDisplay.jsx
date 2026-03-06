import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Default center (Continental US roughly)
const DEFAULT_CENTER = [39.8283, -98.5795];
const DEFAULT_ZOOM = 4;

// Component to handle map view updates natively via Leaflet hooks
function MapController({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (center && map) {
      if (zoom) {
        map.flyTo(center, zoom, { duration: 1.5 });
      } else {
        map.flyTo(center, map.getZoom(), { duration: 1.5 });
      }
    }
  }, [center, zoom, map]);

  return null;
}

// Custom icon creator function for our weather emojis
function createWeatherIcon(emoji, temp) {
  return L.divIcon({
    html: `
      <div style="
        background-color: white; 
        border: 2px solid var(--accent-color);
        border-radius: 50%;
        width: 36px; 
        height: 36px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        font-size: 16px;
        line-height: 1;
      ">
        <span style="font-size: 16px;">${emoji}</span>
      </div>
    `,
    className: 'custom-weather-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18], // Center it over the line
    popupAnchor: [0, -18] // Popup opens above
  });
}

export default function MapDisplay({ center, zoom, routeGeometry, weatherPoints = [] }) {
  // OSRM returns [lon, lat], but Leaflet Polyline expects [lat, lon]
  const leafletPositions = routeGeometry 
    ? routeGeometry.map(([lon, lat]) => [lat, lon]) 
    : [];

  return (
    <div style={{ width: '100%', height: '100%', zIndex: 1 }}>
      <MapContainer 
        center={DEFAULT_CENTER} 
        zoom={DEFAULT_ZOOM} 
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController center={center} zoom={zoom} />
        {/* Render the Route Line if exists */}
        {leafletPositions.length > 0 && (
          <Polyline 
            positions={leafletPositions} 
            color="var(--accent-color)" 
            weight={5} 
            opacity={0.8}
          />
        )}
        
        {/* Render Weather Markers */}
        {weatherPoints.map((wp, idx) => (
          <Marker 
            key={idx} 
            position={[wp.lat, wp.lon]} 
            icon={createWeatherIcon(wp.details.icon, Math.round(wp.weather.tempF))}
            zIndexOffset={100}
          >
            <Popup>
              <div style={{ textAlign: 'center', minWidth: '120px' }}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>{wp.details.icon}</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{Math.round(wp.weather.tempF)}°F</div>
                <div style={{ fontSize: '14px', color: '#666' }}>{wp.details.desc}</div>
                <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #ccc' }} />
                <div style={{ fontSize: '12px' }}>
                  <strong>Arrival:</strong> {wp.arrivalTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </div>
                <div style={{ fontSize: '12px' }}>
                  <strong>Precip:</strong> {wp.weather.precipitationProb}% chance
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
