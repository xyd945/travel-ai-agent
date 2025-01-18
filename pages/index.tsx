import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

// Type definitions
interface MapLocation {
    lat: number;
    lng: number;
}

interface MapContainerProps {
    center: MapLocation;
    markers: Array<{
        location: MapLocation;
        name: string;
        details: PlaceDetails;
        apiKey: string;
    }>;
}

interface PlaceDetails {
    name: string;
    formatted_address: string;
    geometry: {
        location: {
            lat: number;
            lng: number;
        }
    };
    photos?: Array<{
        photo_reference: string;
        html_attributions: string[];
    }>;
    rating?: number;
    website?: string;
    formatted_phone_number?: string;
    opening_hours?: {
        weekday_text: string[];
        open_now?: boolean;
    };
}

// Add new interface for selected place state
interface SelectedPlace {
    details: PlaceDetails;
    apiKey: string;
}

// Map component
const MapContainer: React.FC<MapContainerProps> = ({ center, markers }) => {
    const mapRef = useRef<google.maps.Map | null>(null);
    const [hoveredMarker, setHoveredMarker] = useState<number | null>(null);
    const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    const onLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
    }, []);

    const onUnmount = useCallback(() => {
        mapRef.current = null;
    }, []);

    const handleMarkerMouseOver = (index: number) => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        setHoveredMarker(index);
    };

    const handleMarkerMouseOut = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        hoverTimeoutRef.current = setTimeout(() => {
            setHoveredMarker(null);
        }, 300);
    };

    const handleInfoWindowMouseOver = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
    };

    const handleInfoWindowMouseOut = () => {
        handleMarkerMouseOut();
    };

    const handleMapClick = useCallback(() => {
        setSelectedPlace(null);
    }, []);

    const handleMarkerClick = useCallback((marker: { details: PlaceDetails; apiKey: string }) => {
        setSelectedPlace(marker);
    }, []);

    return (
        <>
            <GoogleMap
                mapContainerStyle={{
                    width: '100vw',
                    height: '100vh',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    zIndex: 1
                }}
                center={center}
                zoom={13}
                onLoad={onLoad}
                onUnmount={onUnmount}
                onClick={handleMapClick}
            >
                {markers.map((marker, index) => (
                    <React.Fragment key={index}>
                        <Marker
                            position={marker.location}
                            title={marker.name}
                            onMouseOver={() => handleMarkerMouseOver(index)}
                            onMouseOut={handleMarkerMouseOut}
                            onClick={() => handleMarkerClick(marker)}
                            options={{
                                cursor: 'pointer',
                                clickable: true,
                                shape: {
                                    coords: [0, 0, 30, 30],
                                    type: 'rect'
                                }
                            }}
                        />
                        {hoveredMarker === index && (
                            <InfoWindow
                                position={{
                                    lat: marker.location.lat + 0.0015,
                                    lng: marker.location.lng
                                }}
                                onCloseClick={() => setHoveredMarker(null)}
                                options={{
                                    pixelOffset: new window.google.maps.Size(0, -5),
                                    // Ensure InfoWindow doesn't interfere with marker events
                                    disableAutoPan: true,
                                    clickable: true
                                }}
                            >
                                <div 
                                    style={{
                                        width: '300px',
                                        height: 'auto',
                                        padding: '0',
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        cursor: 'default' // Ensure consistent cursor in InfoWindow
                                    }}
                                    onMouseOver={handleInfoWindowMouseOver}
                                    onMouseOut={handleInfoWindowMouseOut}
                                >
                                    {marker.details.photos && marker.details.photos.length > 0 && (
                                        <div style={{
                                            width: '100%',
                                            height: '150px',
                                            backgroundImage: `url(https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${marker.details.photos[0].photo_reference}&key=${marker.apiKey})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            position: 'relative'
                                        }}>
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                                                padding: '20px 15px 15px',
                                                color: 'white'
                                            }}>
                                                <h3 style={{ margin: '0', fontSize: '18px' }}>
                                                    {marker.details.name}
                                                </h3>
                                            </div>
                                        </div>
                                    )}
                                    <div style={{ padding: '15px' }}>
                                        {!marker.details.photos && (
                                            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>
                                                {marker.details.name}
                                            </h3>
                                        )}
                                        
                                        {marker.details.rating && (
                                            <div style={{ 
                                                marginBottom: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}>
                                                <span style={{ 
                                                    backgroundColor: '#4CAF50',
                                                    color: 'white',
                                                    padding: '3px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '14px'
                                                }}>
                                                    ★ {marker.details.rating}
                                                </span>
                                            </div>
                                        )}

                                        <p style={{ 
                                            margin: '0 0 8px 0',
                                            fontSize: '14px',
                                            color: '#666'
                                        }}>
                                            {marker.details.formatted_address}
                                        </p>

                                        {marker.details.formatted_phone_number && (
                                            <p style={{ 
                                                margin: '0 0 8px 0',
                                                fontSize: '14px'
                                            }}>
                                                📞 {marker.details.formatted_phone_number}
                                            </p>
                                        )}

                                        {marker.details.opening_hours && (
                                            <p style={{ 
                                                margin: '0 0 8px 0',
                                                fontSize: '14px',
                                                color: marker.details.opening_hours.open_now ? '#4CAF50' : '#f44336'
                                            }}>
                                                {marker.details.opening_hours.open_now ? '✓ Open Now' : '✕ Closed'}
                                            </p>
                                        )}

                                        {marker.details.website && (
                                            <a
                                                href={marker.details.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    display: 'inline-block',
                                                    marginTop: '8px',
                                                    color: '#007bff',
                                                    textDecoration: 'none',
                                                    fontSize: '14px'
                                                }}
                                            >
                                                🌐 Visit Website
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </InfoWindow>
                        )}
                    </React.Fragment>
                ))}
            </GoogleMap>

            {/* Detailed Side Panel */}
            {selectedPlace && (
                <div style={{
                    position: 'fixed',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: '400px',
                    backgroundColor: 'white',
                    boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
                    zIndex: 2,
                    overflowY: 'auto',
                    transition: 'transform 0.3s ease-in-out'
                }}>
                    {/* Header with close button */}
                    <div style={{
                        position: 'sticky',
                        top: 0,
                        padding: '20px',
                        backgroundColor: 'white',
                        borderBottom: '1px solid #eee',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <h2 style={{ margin: 0 }}>{selectedPlace.details.name}</h2>
                        <button
                            onClick={() => setSelectedPlace(null)}
                            style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '24px',
                                cursor: 'pointer',
                                padding: '5px',
                                color: '#666'
                            }}
                        >
                            ×
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '20px' }}>
                        {/* Main Image */}
                        {selectedPlace.details.photos && selectedPlace.details.photos.length > 0 && (
                            <div style={{
                                width: '100%',
                                height: '250px',
                                marginBottom: '20px',
                                borderRadius: '8px',
                                overflow: 'hidden'
                            }}>
                                <img
                                    src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${selectedPlace.details.photos[0].photo_reference}&key=${selectedPlace.apiKey}`}
                                    alt={selectedPlace.details.name}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                    }}
                                />
                            </div>
                        )}

                        {/* Rating */}
                        {selectedPlace.details.rating && (
                            <div style={{ 
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <span style={{
                                    backgroundColor: '#4CAF50',
                                    color: 'white',
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    fontSize: '16px'
                                }}>
                                    ★ {selectedPlace.details.rating}
                                </span>
                            </div>
                        )}

                        {/* Address */}
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ marginBottom: '10px' }}>Address</h3>
                            <p style={{ margin: 0, color: '#666' }}>
                                {selectedPlace.details.formatted_address}
                            </p>
                        </div>

                        {/* Contact */}
                        {selectedPlace.details.formatted_phone_number && (
                            <div style={{ marginBottom: '20px' }}>
                                <h3 style={{ marginBottom: '10px' }}>Contact</h3>
                                <p style={{ margin: 0, color: '#666' }}>
                                    📞 {selectedPlace.details.formatted_phone_number}
                                </p>
                            </div>
                        )}

                        {/* Opening Hours */}
                        {selectedPlace.details.opening_hours && (
                            <div style={{ marginBottom: '20px' }}>
                                <h3 style={{ marginBottom: '10px' }}>Opening Hours</h3>
                                <p style={{
                                    margin: '0 0 10px 0',
                                    color: selectedPlace.details.opening_hours.open_now ? '#4CAF50' : '#f44336',
                                    fontWeight: 'bold'
                                }}>
                                    {selectedPlace.details.opening_hours.open_now ? '✓ Open Now' : '✕ Closed'}
                                </p>
                                {selectedPlace.details.opening_hours.weekday_text && (
                                    <ul style={{ 
                                        margin: 0,
                                        padding: 0,
                                        listStyle: 'none',
                                        color: '#666'
                                    }}>
                                        {selectedPlace.details.opening_hours.weekday_text.map((hours, i) => (
                                            <li key={i} style={{ marginBottom: '5px' }}>{hours}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        {/* Website */}
                        {selectedPlace.details.website && (
                            <div style={{ marginBottom: '20px' }}>
                                <h3 style={{ marginBottom: '10px' }}>Website</h3>
                                <a
                                    href={selectedPlace.details.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        color: '#007bff',
                                        textDecoration: 'none'
                                    }}
                                >
                                    Visit Website
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

// Add new Chat Message interface
interface ChatMessage {
    type: 'user' | 'ai';
    content: string;
}

export default function Home() {
    const [userPrompt, setUserPrompt] = useState('');
    const [aiResponse, setAiResponse] = useState<any>(null);
    const [places, setPlaces] = useState<PlaceDetails[]>([]);
    const [loadingPlaces, setLoadingPlaces] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [mapCenter, setMapCenter] = useState<MapLocation | null>(null);
    const [mapsApiKey, setMapsApiKey] = useState<string>('');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

    // Fetch Maps API key on component mount
    useEffect(() => {
        async function fetchApiKey() {
            try {
                const response = await fetch('/api/maps-key');
                const data = await response.json();
                setMapsApiKey(data.apiKey);
            } catch (error) {
                console.error('Failed to fetch Maps API key:', error);
            }
        }
        fetchApiKey();
    }, []);

    async function handleSend() {
        if (!userPrompt.trim()) return;

        // Add user message to chat
        setChatMessages(prev => [...prev, { type: 'user', content: userPrompt }]);
        
        setAiResponse(null);
        setPlaces([]);
        setLoadingPlaces(true);
        setAiError(null);

        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userPrompt })
            });

            if (!res.ok) {
                const errorData = await res.json();
                setAiError(`AI API Error: ${res.status} - ${errorData.error || res.statusText}`);
                return;
            }

            const aiData = await res.json();
            setAiResponse(aiData);

            if (aiData.location === "not_travel_related") {
                console.log("Not a travel related question")
                return
            }

            if (aiData.location) {
                console.log("Location from AI:", aiData.location);
            }

            if (aiData.placesOfInterest && aiData.placesOfInterest.length > 0) {
                const placeDetails = [];
                for (const place of aiData.placesOfInterest) {
                    try {
                        const res = await fetch(`/api/places?placeName=${encodeURIComponent(place.name)}&location=${encodeURIComponent(aiData.location)}`);
                        if (!res.ok) {
                            console.error(`Error fetching place details for ${place.name}: ${res.status} ${res.statusText}`);
                            const errorData = await res.json();
                            console.error("Error details:", errorData);
                            continue;
                        }
                        const data = await res.json();
                        if (data.place) {
                            placeDetails.push(data.place);
                        }
                    } catch (error) {
                        console.error(`Error fetching details for ${place.name}:`, error);
                    }
                }
                setPlaces(placeDetails);
                
                // Update map center if places are found
                if (placeDetails.length > 0 && placeDetails[0].geometry) {
                    setMapCenter({
                        lat: placeDetails[0].geometry.location.lat,
                        lng: placeDetails[0].geometry.location.lng
                    });
                }
            } else {
                console.log("No places of interest found.")
            }

            // Add AI response to chat
            if (aiData.location !== "not_travel_related") {
                setChatMessages(prev => [...prev, { 
                    type: 'ai', 
                    content: `I found some interesting places in ${aiData.location}. Let me show you on the map.`
                }]);
            } else {
                setChatMessages(prev => [...prev, { 
                    type: 'ai', 
                    content: "I can only help with travel-related questions. Please ask me about places you'd like to visit!"
                }]);
            }

        } catch (err) {
            console.error("Overall error:", err);
        } finally {
            setLoadingPlaces(false);
        }
    }

    // Prepare markers for the map
    const mapMarkers = places.map(place => ({
        location: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
        },
        name: place.name,
        details: place,
        apiKey: mapsApiKey
    }));

    return (
        <main style={{ 
            width: '100vw', 
            height: '100vh', 
            position: 'relative', 
            overflow: 'hidden' 
        }}>
            {/* Map Section - Now full screen */}
            {mapCenter && mapsApiKey && (
                <LoadScript googleMapsApiKey={mapsApiKey}>
                    <MapContainer center={mapCenter} markers={mapMarkers} />
                </LoadScript>
            )}

            {/* Chat Module Overlay */}
            <div style={{
                position: 'fixed',
                left: 20,
                top: 20,
                bottom: 20,
                width: '400px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Chat Header */}
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid #eee',
                    backgroundColor: '#f8f9fa'
                }}>
                    <h2 style={{ margin: 0 }}>Travel Assistant</h2>
                </div>

                {/* Chat Messages */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    {chatMessages.map((msg, idx) => (
                        <div key={idx} style={{
                            alignSelf: msg.type === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '80%',
                            backgroundColor: msg.type === 'user' ? '#007bff' : '#f1f3f5',
                            color: msg.type === 'user' ? 'white' : 'black',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            borderBottomRightRadius: msg.type === 'user' ? '4px' : '12px',
                            borderBottomLeftRadius: msg.type === 'ai' ? '4px' : '12px'
                        }}>
                            {msg.content}
                        </div>
                    ))}
                    {loadingPlaces && (
                        <div style={{
                            alignSelf: 'flex-start',
                            backgroundColor: '#f1f3f5',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            borderBottomLeftRadius: '4px'
                        }}>
                            Searching for places...
                        </div>
                    )}
                </div>

                {/* Chat Input */}
                <div style={{
                    padding: '20px',
                    borderTop: '1px solid #eee',
                    backgroundColor: 'white',
                    display: 'flex',
                    gap: '10px'
                }}>
                    <input
                        type="text"
                        value={userPrompt}
                        onChange={(e) => setUserPrompt(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask about travel destinations..."
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid #ddd',
                            outline: 'none'
                        }}
                    />
                    <button 
                        onClick={handleSend}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        Send
                    </button>
                </div>
            </div>

            {/* Places Info - Hidden by default, can be toggled later */}
            <div style={{ display: 'none' }}>
                {places.length > 0 && (
                    <div style={{ marginTop: 20 }}>
                        <h2>Places Info from Google Maps</h2>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {places.map((place, idx) => (
                                <li key={idx} style={{ 
                                    marginBottom: 30, 
                                    padding: 20, 
                                    borderRadius: 8,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    backgroundColor: '#fff'
                                }}>
                                    <h3 style={{ margin: '0 0 10px 0' }}>{place.name}</h3>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div>
                                            <p><strong>Address:</strong> {place.formatted_address}</p>
                                            
                                            {place.rating && (
                                                <p><strong>Rating:</strong> {place.rating} / 5</p>
                                            )}
                                            
                                            {place.formatted_phone_number && (
                                                <p><strong>Phone:</strong> {place.formatted_phone_number}</p>
                                            )}
                                            
                                            {place.website && (
                                                <p>
                                                    <strong>Website:</strong>{' '}
                                                    <a href={place.website} target="_blank" rel="noopener noreferrer">
                                                        Visit Website
                                                    </a>
                                                </p>
                                            )}
                                            
                                            {place.opening_hours && (
                                                <div>
                                                    <strong>Opening Hours:</strong>
                                                    <div style={{ fontSize: '0.9em', marginTop: '5px' }}>
                                                        {place.opening_hours.open_now !== undefined && (
                                                            <p style={{ 
                                                                color: place.opening_hours.open_now ? 'green' : 'red',
                                                                fontWeight: 'bold'
                                                            }}>
                                                                {place.opening_hours.open_now ? 'Open Now' : 'Closed'}
                                                            </p>
                                                        )}
                                                        {place.opening_hours.weekday_text && (
                                                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                                                {place.opening_hours.weekday_text.map((hours, i) => (
                                                                    <li key={i} style={{ marginBottom: '2px' }}>{hours}</li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            {place.geometry && (
                                                <p>
                                                    <strong>Location:</strong><br />
                                                    Latitude: {place.geometry.location.lat.toFixed(6)}<br />
                                                    Longitude: {place.geometry.location.lng.toFixed(6)}
                                                </p>
                                            )}
                                            
                                            {place.photos && place.photos.length > 0 && (
                                                <div style={{ marginTop: '10px' }}>
                                                    <img
                                                        src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${mapsApiKey}`}
                                                        alt={`Photo of ${place.name}`}
                                                        style={{
                                                            width: '100%',
                                                            height: 'auto',
                                                            borderRadius: '4px'
                                                        }}
                                                    />
                                                    {place.photos[0].html_attributions.map((attribution, i) => (
                                                        <div 
                                                            key={i}
                                                            style={{ fontSize: '0.8em', marginTop: '5px' }}
                                                            dangerouslySetInnerHTML={{ __html: attribution }}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </main>
    );
}