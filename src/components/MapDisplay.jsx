import { useEffect, useState } from 'react';
import { APIProvider, Map, useMap, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';

const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 };
const DEFAULT_ZOOM = 4;

function MapController({ center, bounds }) {
  const map = useMap();
  
  useEffect(() => {
    if (map && bounds) {
      const googleBounds = new window.google.maps.LatLngBounds();
      bounds.forEach(coord => {
        googleBounds.extend({ lat: coord[0], lng: coord[1] });
      });
      map.fitBounds(googleBounds, { padding: 50 });
    } else if (map && center) {
      map.panTo({ lat: center[0], lng: center[1] });
    }
  }, [center, bounds, map]);

  return null;
}

// Component to render the polyline
function DirectionsRenderer({ encodedPolyline }) {
  const map = useMap();
  const [polyline, setPolyline] = useState(null);

  useEffect(() => {
    if (!map || !window.google) return;

    let isActive = true;
    const newPolyline = new window.google.maps.Polyline({
      strokeColor: '#3b82f6', // Match our accent-color roughly
      strokeOpacity: 0.8,
      strokeWeight: 5,
    });

    // Defer the state update to avoid calling it directly during render/mount phase hook evaluation if possible
    Promise.resolve().then(() => {
      if (isActive) setPolyline(newPolyline);
    });

    return () => {
      isActive = false;
      newPolyline.setMap(null);
    };
  }, [map]);

  useEffect(() => {
    if (!polyline || !window.google) return;

    if (encodedPolyline) {
      const path = window.google.maps.geometry.encoding.decodePath(encodedPolyline);
      polyline.setPath(path);
      polyline.setMap(map);
    } else {
      polyline.setMap(null);
      polyline.setPath([]);
    }
  }, [map, polyline, encodedPolyline]);

  // Clean up
  useEffect(() => {
    return () => {
      if (polyline) {
        polyline.setMap(null);
      }
    };
  }, [polyline]);

  return null;
}

function WeatherMarker({ wp }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const position = { lat: wp.lat, lng: wp.lon };

  // Format the arrival time correctly, since JSON parsing might turn it into a string
  const arrivalTime = new Date(wp.arrivalTime);

  return (
    <>
      <AdvancedMarker
        position={position}
        onClick={() => setInfoOpen(true)}
      >
        <div style={{
          backgroundColor: 'white',
          border: '2px solid var(--accent-color)',
          borderRadius: '50%',
          width: '36px',
          height: '36px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
          fontSize: '16px',
          lineHeight: 1,
          cursor: 'pointer'
        }}>
          <span style={{ fontSize: '16px' }}>{wp.details.icon}</span>
        </div>
      </AdvancedMarker>

      {infoOpen && (
        <InfoWindow
          position={position}
          onCloseClick={() => setInfoOpen(false)}
          pixelOffset={[0, -18]}
        >
          <div style={{ textAlign: 'center', minWidth: '120px' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>{wp.details.icon}</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{Math.round(wp.weather.tempF)}°F</div>
            <div style={{ fontSize: '14px', color: '#666' }}>{wp.details.desc}</div>
            <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #ccc' }} />
            <div style={{ fontSize: '12px', color: '#333' }}>
              <strong>Arrival:</strong> {arrivalTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </div>
            <div style={{ fontSize: '12px', color: '#333' }}>
              <strong>Precip:</strong> {wp.weather.precipitationProb}% chance
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export default function MapDisplay({ center, encodedPolyline, bounds, weatherPoints = [] }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  if (!apiKey) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#ef4444' }}>Missing Google Maps API Key</h2>
          <p>Please add <code>VITE_GOOGLE_MAPS_API_KEY</code> to your environment variables or <code>.env</code> file.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', zIndex: 1 }}>
      <APIProvider apiKey={apiKey} libraries={['geometry']}>
        <Map
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          mapId="DEMO_MAP_ID"
          disableDefaultUI={true}
          zoomControl={true}
          style={{ width: '100%', height: '100%' }}
        >
          <MapController center={center} bounds={bounds} />

          <DirectionsRenderer encodedPolyline={encodedPolyline} />

          {weatherPoints.map((wp, idx) => (
            <WeatherMarker key={idx} wp={wp} />
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
