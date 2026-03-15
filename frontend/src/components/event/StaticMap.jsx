// src/components/event/StaticMap.jsx
import React from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '250px',
  borderRadius: '8px',
};
const LIBRARIES = ['places']; // Define libraries as a constant

function StaticMap({ lat, lng }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  if (loadError) {
    const hasKey = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
    return (
      <div style={{ padding: 12, background: '#fff7ed', color: '#9a3412', borderRadius: 8, border: '1px solid #fdba74' }}>
        {hasKey ? 'Failed to load Google Maps. Please check network and key restrictions.' : 'Google Maps API key is missing. Set VITE_GOOGLE_MAPS_API_KEY.'}
      </div>
    );
  }

  if (!isLoaded) return <div>Loading map...</div>;
  if (!lat || !lng) return null; // Don't render if no coordinates

  const center = { lat, lng };

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={15}
      options={{
        // Disable all controls for a static look
        disableDefaultUI: true,
        draggable: false,
        scrollwheel: false,
        zoomControl: false,
      }}
    >
      <Marker position={center} />
    </GoogleMap>
  );
}

export default React.memo(StaticMap); 