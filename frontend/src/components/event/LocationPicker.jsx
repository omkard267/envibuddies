import React, { useRef, useCallback, useState, useEffect } from "react";
import { GoogleMap, useLoadScript } from "@react-google-maps/api";

const libraries = ["places"];
const mapContainerStyle = { width: "100%", height: "300px" };
const defaultCenter = { lat: 19.076, lng: 72.8777 }; // Mumbai

export default function LocationPicker({ value, onChange }) {
  const [error, setError] = useState(null);
  const [apiKeyStatus, setApiKeyStatus] = useState("checking");
  const [inputValue, setInputValue] = useState(value?.address || "");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  // Update input value when external value changes
  useEffect(() => {
    setInputValue(value?.address || "");
  }, [value?.address]);

  // Debug API key
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (apiKey) {
      setApiKeyStatus("found");
    } else {
      setApiKeyStatus("missing");
    }
  }, [isLoaded, loadError]);

  // Safety check for value prop
  const safeValue = value || {};

  const handleMapClick = useCallback((e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    
    // Reverse geocoding to get address
    try {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const address = results[0].formatted_address;
          setInputValue(address);
          setSuggestions([]);
          setShowSuggestions(false);
          onChange({
            lat,
            lng,
            address,
          });
        } else {
          // Fallback if geocoding fails
          const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          setInputValue(address);
          setSuggestions([]);
          setShowSuggestions(false);
          onChange({
            lat,
            lng,
            address,
          });
        }
      });
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      // Fallback if geocoding fails
      const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setInputValue(address);
      setSuggestions([]);
      setShowSuggestions(false);
      onChange({
        lat,
        lng,
        address,
      });
    }
  }, [onChange]);

  const handleAddressChange = useCallback((e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedIndex(-1);
    
    if (!newValue.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      onChange(null);
      return;
    }

    // Use Places AutocompleteService for suggestions
    if (window.google && window.google.maps && window.google.maps.places) {
      try {
        const service = new window.google.maps.places.AutocompleteService();
        service.getPlacePredictions(
          {
            input: newValue,
            componentRestrictions: { country: 'IN' }, // Restrict to India
            types: ['establishment', 'geocode']
          },
          (predictions, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              setSuggestions(predictions);
              setShowSuggestions(true);
            } else {
              setSuggestions([]);
              setShowSuggestions(false);
            }
          }
        );
      } catch (error) {
        console.error('Error getting place predictions:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }
  }, [onChange]);

  const handleSuggestionClick = useCallback((suggestion) => {
    setInputValue(suggestion.description);
    setSuggestions([]);
    setShowSuggestions(false);
    
    // Get place details using PlacesService
    try {
      const service = new window.google.maps.places.PlacesService(document.createElement('div'));
      service.getDetails(
        {
          placeId: suggestion.place_id,
          fields: ['geometry', 'formatted_address']
        },
        (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place && place.geometry) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            onChange({
              lat,
              lng,
              address: place.formatted_address || suggestion.description,
            });
          }
        }
      );
    } catch (error) {
      console.error('Error getting place details:', error);
    }
  }, [onChange]);

  const handleKeyDown = useCallback((e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  }, [showSuggestions, suggestions, selectedIndex, handleSuggestionClick]);

  if (loadError) {
    console.error("Google Maps load error:", loadError);
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'red' }}>
        <h3>Google Maps Error</h3>
        <p>Failed to load Google Maps. Please check your API key configuration.</p>
        <p>Error: {loadError.message}</p>
        <p>API Key Status: {apiKeyStatus}</p>
        <div style={{ marginTop: 10, padding: 10, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
          <h4>Debug Info:</h4>
          <p>API Key exists: {apiKeyStatus === "found" ? "✅ Yes" : "❌ No"}</p>
          <p>Environment variable: VITE_GOOGLE_MAPS_API_KEY</p>
          <p>Current domain: {window.location.hostname}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <div>
      <div style={{ marginBottom: 8, position: 'relative' }}>
        <input
          type="text"
          placeholder="Enter location or click on map"
          value={inputValue}
          onChange={handleAddressChange}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Delay hiding suggestions to allow clicking
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          style={{ width: "100%", padding: 8 }}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.place_id}
                onClick={() => handleSuggestionClick(suggestion)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === selectedIndex ? '#f0f0f0' : 'transparent',
                  borderBottom: index < suggestions.length - 1 ? '1px solid #eee' : 'none'
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {suggestion.description}
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={safeValue?.lat && safeValue?.lng ? { lat: safeValue.lat, lng: safeValue.lng } : defaultCenter}
          zoom={safeValue?.lat && safeValue?.lng ? 15 : 10}
          onClick={handleMapClick}
          onError={(error) => {
            console.error("Google Map error:", error);
            setError(error);
          }}
        />
        {safeValue?.lat && safeValue?.lng && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '20px',
              height: '20px',
              backgroundColor: '#1976d2',
              border: '2px solid white',
              borderRadius: '50%',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              zIndex: 1,
              pointerEvents: 'none'
            }}
          />
        )}
      </div>
      {error && (
        <div style={{ marginTop: 8, padding: 8, backgroundColor: '#ffebee', color: '#c62828', borderRadius: 4 }}>
          <strong>Map Error:</strong> {error.message}
        </div>
      )}
    </div>
  );
}