import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
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

export default function MapDisplay({ center, zoom }) {
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
        {/* Routing paths and weather markers will be injected directly here from App state */}
      </MapContainer>
    </div>
  );
}
