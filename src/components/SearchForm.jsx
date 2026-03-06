import { useState } from 'react';

export default function SearchForm({ onSearch, isLoading }) {
  const [start, setStart] = useState('');
  const [destination, setDestination] = useState('');
  
  // Default departure time is "now"
  const now = new Date();
  // Format as YYYY-MM-DDThh:mm for the datetime-local input
  const defaultTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [departureTime, setDepartureTime] = useState(defaultTime);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!start.trim() || !destination.trim()) return;
    
    onSearch({ start, destination, departureTime });
  };

  return (
    <div className="glass-panel" style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      width: '350px',
      padding: '24px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
          Will I Get Wet? 🚴💦
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
          Plan your bike route and see the weather you'll hit exactly when you get there.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Start Location</label>
          <input
            type="text"
            placeholder="e.g. Brooklyn, NY"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            style={{ 
              padding: '10px 12px', 
              borderRadius: '8px', 
              border: '1px solid var(--panel-border)',
              backgroundColor: 'rgba(255,255,255,0.7)',
              outline: 'none',
              fontFamily: 'inherit'
            }}
            required
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Destination</label>
          <input
            type="text"
            placeholder="e.g. Central Park"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            style={{ 
              padding: '10px 12px', 
              borderRadius: '8px', 
              border: '1px solid var(--panel-border)',
              backgroundColor: 'rgba(255,255,255,0.7)',
              outline: 'none',
              fontFamily: 'inherit'
            }}
            required
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Departure Time</label>
          <input
            type="datetime-local"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            style={{ 
              padding: '10px 12px', 
              borderRadius: '8px', 
              border: '1px solid var(--panel-border)',
              backgroundColor: 'rgba(255,255,255,0.7)',
              outline: 'none',
              fontFamily: 'inherit'
            }}
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          style={{
            marginTop: '8px',
            padding: '12px',
            backgroundColor: 'var(--accent-color)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            transition: 'background-color 0.2s ease',
            fontFamily: 'inherit'
          }}
        >
          {isLoading ? 'Calculating Route...' : 'Check Weather Route'}
        </button>
      </form>
    </div>
  );
}
