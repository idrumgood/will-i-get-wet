import { useState } from 'react';
import './App.css';

function App() {
  return (
    <div className="app-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Floating UI Panel */}
      <div 
        className="glass-panel" 
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          width: '350px',
          padding: '24px',
          zIndex: 1000, /* Above map */
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Will I Get Wet? 🚴💦
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Plot your bike route and find out the exact weather you'll face along the way.
        </p>
      </div>

      {/* Map Placeholder */}
      <div style={{ width: '100%', height: '100%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Map will load here</p>
      </div>
    </div>
  );
}

export default App;
