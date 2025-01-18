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
    onMarkerClick: (place: PlaceDetails) => void;
    highlightedPlace: HighlightedPlace | null;
    onHighlightedPlaceChange: (place: HighlightedPlace | null) => void;
}

interface PlaceDetails {
    name: string;
    geometry: {
        location: {
            lat: number;
            lng: number;
        }
    };
    formatted_address: string;
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

interface HighlightedPlace {
    location: MapLocation;
    details: PlaceDetails;
}

// Map component
const MapContainer: React.FC<MapContainerProps> = ({ 
    center, 
    markers,
    onMarkerClick,
    highlightedPlace,
    onHighlightedPlaceChange
}) => {
    const mapRef = useRef<google.maps.Map | null>(null);
    const [hoveredMarker, setHoveredMarker] = useState<number | null>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    return (
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
            onLoad={(map) => { mapRef.current = map; }}
            onUnmount={() => { mapRef.current = null; }}
        >
            {markers.map((marker, index) => (
                <React.Fragment key={index}>
                    <Marker
                        position={marker.location}
                        title={marker.name}
                        onClick={() => onMarkerClick(marker.details)}
                        onMouseOver={() => handleMarkerMouseOver(index)}
                        onMouseOut={handleMarkerMouseOut}
                        animation={
                            highlightedPlace?.details.name === marker.details.name 
                                ? google.maps.Animation.BOUNCE 
                                : undefined
                        }
                    />

                    {hoveredMarker === index && (
                        <InfoWindow
                            position={{
                                lat: marker.location.lat + 0.0015,
                                lng: marker.location.lng
                            }}
                            onCloseClick={() => setHoveredMarker(null)}
                        >
                            <div 
                                style={{
                                    width: '300px',
                                    cursor: 'pointer'
                                }}
                                onMouseOver={handleInfoWindowMouseOver}
                                onMouseOut={handleInfoWindowMouseOut}
                                onClick={() => onMarkerClick(marker.details)}
                            >
                                <InfoWindowContent marker={marker} />
                            </div>
                        </InfoWindow>
                    )}

                    {highlightedPlace?.details.name === marker.details.name && (
                        <InfoWindow
                            position={{
                                lat: marker.location.lat + 0.0015,
                                lng: marker.location.lng
                            }}
                            onCloseClick={() => onHighlightedPlaceChange(null)}
                        >
                            <div 
                                style={{
                                    width: '300px',
                                    cursor: 'pointer'
                                }}
                                onClick={() => onMarkerClick(marker.details)}
                            >
                                <InfoWindowContent marker={marker} />
                            </div>
                        </InfoWindow>
                    )}
                </React.Fragment>
            ))}
        </GoogleMap>
    );
};

// Add InfoWindowContent component for reusability
const InfoWindowContent: React.FC<{ marker: any }> = ({ marker }) => (
    <div style={{
        padding: '8px',
        borderRadius: '8px'
    }}>
        <h3 style={{ margin: '0 0 8px 0' }}>{marker.name}</h3>
        {marker.details.photos && marker.details.photos.length > 0 && (
            <img
                src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=300&photoreference=${marker.details.photos[0].photo_reference}&key=${marker.apiKey}`}
                alt={marker.name}
                style={{
                    width: '100%',
                    height: '150px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    marginBottom: '8px'
                }}
            />
        )}
        {marker.details.formatted_address && (
            <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                📍 {marker.details.formatted_address}
            </p>
        )}
        {marker.details.rating && (
            <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                ⭐ {marker.details.rating}
            </p>
        )}
    </div>
);

// Update the interface to be more specific
interface PlaceItem {
    name: string;
    description: string;
    type: string;
    priceRange?: string;
    experience?: string;
}

interface ChatMessage {
    type: 'user' | 'ai';
    content: string | PlaceItem[];
    isHeader?: boolean;
    isList?: boolean;
}

export default function Home() {
    const [userPrompt, setUserPrompt] = useState('');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [aiResponse, setAiResponse] = useState<any>(null);
    const [places, setPlaces] = useState<any[]>([]);
    const [loadingPlaces, setLoadingPlaces] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [mapCenter, setMapCenter] = useState<MapLocation | null>(null);
    const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
    const [highlightedPlace, setHighlightedPlace] = useState<HighlightedPlace | null>(null);
    const [mapsApiKey, setMapsApiKey] = useState<string>('');

    // Fetch the Maps API key when component mounts
    useEffect(() => {
        async function fetchMapsKey() {
            try {
                const res = await fetch('/api/maps-key');
                const data = await res.json();
                if (data.apiKey) {
                    setMapsApiKey(data.apiKey);
                }
            } catch (error) {
                console.error('Error fetching maps key:', error);
            }
        }
        fetchMapsKey();
    }, []);

    const handlePlaceClick = (place: PlaceItem) => {
        const matchedPlace = places.find(p => p.name === place.name);
        if (matchedPlace) {
            setHighlightedPlace({
                location: {
                    lat: matchedPlace.geometry.location.lat,
                    lng: matchedPlace.geometry.location.lng
                },
                details: matchedPlace
            });
            setMapCenter({
                lat: matchedPlace.geometry.location.lat,
                lng: matchedPlace.geometry.location.lng
            });
        }
    };

    async function handleSend() {
        if (!userPrompt.trim()) return;

        setChatMessages(prev => [...prev, { type: 'user', content: userPrompt }]);
        setUserPrompt('');
        
        setAiResponse(null);
        setPlaces([]);
        setLoadingPlaces(true);
        setAiError(null);

        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userPrompt,
                    conversationHistory: chatMessages
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                setAiError(`AI API Error: ${res.status} - ${errorData.error || res.statusText}`);
                return;
            }

            const aiData = await res.json();
            console.log('AI Response:', aiData);
            setAiResponse(aiData);

            if (aiData.location !== "not_travel_related") {
                // Add initial response
                setChatMessages(prev => [...prev, { 
                    type: 'ai', 
                    content: `I'll help you find what you're looking for in ${aiData.location}!`
                }]);

                // Process places for Google Maps
                if (aiData.placesOfInterest.length > 0) {
                    try {
                        const placesRes = await fetch('/api/places', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify({ 
                                places: aiData.placesOfInterest, 
                                location: aiData.location 
                            })
                        });

                        if (placesRes.ok) {
                            const placesData = await placesRes.json();
                            console.log('Places Data:', placesData);
                            setPlaces(placesData);
                            if (placesData.length > 0) {
                                setMapCenter({
                                    lat: placesData[0].geometry.location.lat,
                                    lng: placesData[0].geometry.location.lng
                                });
                            }
                        } else {
                            const errorText = await placesRes.text();
                            console.error('Places API error:', errorText);
                        }
                    } catch (error) {
                        console.error('Error fetching place details:', error);
                    } finally {
                        setLoadingPlaces(false);
                    }
                }

                // Group and display places
                const placesByType = aiData.placesOfInterest.reduce((acc: any, place: any) => {
                    const key = place.type || 'other';
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(place);
                    return acc;
                }, {});

                // Add messages for each type of place
                Object.entries(placesByType).forEach(([type, places]: [string, any[]]) => {
                    const typeText = {
                        restaurant: "dining spots",
                        hotel: "places to stay",
                        attraction: "attractions",
                        shopping: "shopping venues",
                        entertainment: "entertainment venues"
                    }[type] || "places";

                    // Add header
                    setChatMessages(prev => [...prev, {
                        type: 'ai',
                        content: `Here are some ${typeText} in ${aiData.location}:`,
                        isHeader: true
                    }]);

                    // Add places list
                    setChatMessages(prev => [...prev, {
                        type: 'ai',
                        content: places,
                        isList: true
                    }]);
                });

                // Add final message
                setChatMessages(prev => [...prev, { 
                    type: 'ai', 
                    content: "I've marked these locations on the map for you to explore. Click any place card or marker for more details!" 
                }]);
            } else {
                setChatMessages(prev => [...prev, { 
                    type: 'ai', 
                    content: "I apologize, but I'm not sure I understand your question. Could you please provide more details about what you're looking for?" 
                }]);
            }
        } catch (err) {
            console.error('Error:', err);
            setAiError('Failed to get AI response');
        }
    }

    // Add console logs to track map data
    useEffect(() => {
        console.log('Current places:', places);
        console.log('Current mapMarkers:', mapMarkers);
        console.log('Current mapCenter:', mapCenter);
    }, [places, mapCenter]);

    // Update mapMarkers creation
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
        <main style={{ height: '100vh', position: 'relative' }}>
            {mapCenter && mapsApiKey && (
                <LoadScript googleMapsApiKey={mapsApiKey}>
                    <MapContainer 
                        center={mapCenter} 
                        markers={mapMarkers}
                        onMarkerClick={(place) => {
                            setSelectedPlace({ details: place, apiKey: mapsApiKey });
                        }}
                        highlightedPlace={highlightedPlace}
                        onHighlightedPlaceChange={setHighlightedPlace}
                    />
                </LoadScript>
            )}

            {/* Chat Window */}
            <div style={{
                position: 'fixed',
                left: 0,
                top: 0,
                bottom: 0,
                width: '400px',
                backgroundColor: 'white',
                boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column'
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
                        <div
                            key={idx}
                            style={{
                                alignSelf: msg.type === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '80%',
                                backgroundColor: msg.type === 'user' ? '#007bff' : '#f1f3f5',
                                color: msg.type === 'user' ? 'white' : 'black',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                borderBottomRightRadius: msg.type === 'user' ? '4px' : '12px',
                                borderBottomLeftRadius: msg.type === 'ai' ? '4px' : '12px',
                                marginBottom: '12px'
                            }}
                        >
                            {msg.isList ? (
                                <div className="places-list">
                                    {Array.isArray(msg.content) && msg.content.map((place: PlaceItem, index: number) => {
                                        const normalizeString = (str: string) => {
                                            return str
                                                .toLowerCase()
                                                .normalize('NFD')
                                                .replace(/[\u0300-\u036f]/g, '')
                                                .replace(/[^a-z0-9]/g, ' ')
                                                .replace(/\s+/g, ' ')
                                                .trim();
                                        };

                                        const matchedPlace = places.find(p => {
                                            const normalizedPlaceName = normalizeString(p.name);
                                            const normalizedSearchName = normalizeString(place.name);
                                            return (
                                                normalizedPlaceName === normalizedSearchName ||
                                                normalizedPlaceName.includes(normalizedSearchName) ||
                                                normalizedSearchName.includes(normalizedPlaceName) ||
                                                normalizedPlaceName.replace(/^(le |la |l |de |du |des |the |a |an )/, '') ===
                                                normalizedSearchName.replace(/^(le |la |l |de |du |des |the |a |an )/, '')
                                            );
                                        });

                                        // Helper function to render price level
                                        const renderPriceLevel = (level?: number) => {
                                            if (!level) return 'Price not available';
                                            return '€'.repeat(level);
                                        };

                                        return (
                                            <div 
                                                key={index}
                                                onClick={() => {
                                                    if (matchedPlace) {
                                                        setHighlightedPlace({
                                                            location: {
                                                                lat: matchedPlace.geometry.location.lat,
                                                                lng: matchedPlace.geometry.location.lng
                                                            },
                                                            details: matchedPlace
                                                        });
                                                        setMapCenter({
                                                            lat: matchedPlace.geometry.location.lat,
                                                            lng: matchedPlace.geometry.location.lng
                                                        });
                                                    }
                                                }}
                                                style={{
                                                    marginBottom: index < msg.content.length - 1 ? '12px' : 0,
                                                    padding: '16px',
                                                    backgroundColor: 'white',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                                    cursor: matchedPlace ? 'pointer' : 'default',
                                                    transition: 'all 0.2s ease',
                                                    border: highlightedPlace?.details.name === place.name ? 
                                                        '2px solid #007bff' : '1px solid #e0e0e0'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (matchedPlace) {
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (matchedPlace) {
                                                        e.currentTarget.style.transform = 'none';
                                                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                                                    }
                                                }}
                                            >
                                                {/* Name and Rating */}
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    marginBottom: '8px'
                                                }}>
                                                    <div style={{
                                                        fontWeight: 'bold',
                                                        fontSize: '1.1em',
                                                        color: '#2c3e50'
                                                    }}>
                                                        {place.name}
                                                    </div>
                                                    {matchedPlace?.rating && (
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            backgroundColor: '#f8f9fa',
                                                            padding: '4px 8px',
                                                            borderRadius: '12px',
                                                            fontSize: '0.9em'
                                                        }}>
                                                            <span style={{ color: '#ffd700' }}>⭐</span>
                                                            <span style={{ color: '#666' }}>
                                                                {matchedPlace.rating}
                                                                {matchedPlace.user_ratings_total && (
                                                                    <span style={{ fontSize: '0.85em', marginLeft: '4px' }}>
                                                                        ({matchedPlace.user_ratings_total})
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Price Level and Type */}
                                                <div style={{
                                                    display: 'flex',
                                                    gap: '8px',
                                                    marginBottom: '8px',
                                                    flexWrap: 'wrap'
                                                }}>
                                                    {matchedPlace?.price_level && (
                                                        <span style={{
                                                            backgroundColor: '#e9ecef',
                                                            padding: '4px 8px',
                                                            borderRadius: '12px',
                                                            fontSize: '0.9em',
                                                            color: '#495057'
                                                        }}>
                                                            {renderPriceLevel(matchedPlace.price_level)}
                                                        </span>
                                                    )}
                                                    {place.type && (
                                                        <span style={{
                                                            backgroundColor: '#e9ecef',
                                                            padding: '4px 8px',
                                                            borderRadius: '12px',
                                                            fontSize: '0.9em',
                                                            color: '#495057'
                                                        }}>
                                                            {place.type}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Description */}
                                                <div style={{
                                                    fontSize: '0.9em',
                                                    color: '#666',
                                                    marginBottom: '8px'
                                                }}>
                                                    {place.description}
                                                </div>

                                                {/* View on Map Button */}
                                                {matchedPlace ? (
                                                    <div style={{
                                                        fontSize: '0.85em',
                                                        color: '#007bff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}>
                                                        <span>📍</span> Click to view on map
                                                    </div>
                                                ) : (
                                                    <div style={{
                                                        fontSize: '0.85em',
                                                        color: '#999'
                                                    }}>
                                                        Location details not available
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ whiteSpace: 'pre-wrap' }}>
                                    {msg.content}
                                </div>
                            )}
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
                    backgroundColor: 'white'
                }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
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

            {/* Details Card */}
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
                    padding: '20px'
                }}>
                    {/* Close button */}
                    <button
                        onClick={() => setSelectedPlace(null)}
                        style={{
                            position: 'absolute',
                            right: '20px',
                            top: '20px',
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            padding: '5px 10px',
                            borderRadius: '50%',
                            hover: {
                                backgroundColor: '#f0f0f0'
                            }
                        }}
                    >
                        ×
                    </button>

                    {/* Main content */}
                    <div style={{ marginTop: '20px' }}>
                        {/* Photo Gallery */}
                        {selectedPlace.details.photos && selectedPlace.details.photos.length > 0 && (
                            <div style={{
                                marginBottom: '20px',
                                borderRadius: '12px',
                                overflow: 'hidden'
                            }}>
                                <img
                                    src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${selectedPlace.details.photos[0].photo_reference}&key=${selectedPlace.apiKey}`}
                                    alt={selectedPlace.details.name}
                                    style={{
                                        width: '100%',
                                        height: '250px',
                                        objectFit: 'cover'
                                    }}
                                />
                            </div>
                        )}

                        {/* Place Name */}
                        <h2 style={{
                            margin: '0 0 16px 0',
                            fontSize: '24px',
                            color: '#2c3e50'
                        }}>
                            {selectedPlace.details.name}
                        </h2>

                        {/* Rating */}
                        {selectedPlace.details.rating && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                marginBottom: '16px',
                                gap: '8px'
                            }}>
                                <span style={{ fontSize: '18px' }}>⭐</span>
                                <span style={{ fontWeight: 'bold' }}>{selectedPlace.details.rating}</span>
                                {selectedPlace.details.user_ratings_total && (
                                    <span style={{ color: '#666' }}>
                                        ({selectedPlace.details.user_ratings_total} reviews)
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Address */}
                        {selectedPlace.details.formatted_address && (
                            <div style={{
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px'
                            }}>
                                <span style={{ fontSize: '18px' }}>📍</span>
                                <span>{selectedPlace.details.formatted_address}</span>
                            </div>
                        )}

                        {/* Phone Number */}
                        {selectedPlace.details.formatted_phone_number && (
                            <div style={{
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span style={{ fontSize: '18px' }}>📞</span>
                                <a 
                                    href={`tel:${selectedPlace.details.formatted_phone_number}`}
                                    style={{
                                        color: '#007bff',
                                        textDecoration: 'none'
                                    }}
                                >
                                    {selectedPlace.details.formatted_phone_number}
                                </a>
                            </div>
                        )}

                        {/* Opening Hours */}
                        {selectedPlace.details.opening_hours && (
                            <div style={{ marginBottom: '20px' }}>
                                <h3 style={{
                                    fontSize: '18px',
                                    marginBottom: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span>🕒</span>
                                    Opening Hours
                                    {selectedPlace.details.opening_hours.open_now && (
                                        <span style={{
                                            backgroundColor: '#4CAF50',
                                            color: 'white',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            marginLeft: '8px'
                                        }}>
                                            Open Now
                                        </span>
                                    )}
                                </h3>
                                {selectedPlace.details.opening_hours.weekday_text && (
                                    <ul style={{
                                        listStyle: 'none',
                                        padding: 0,
                                        margin: 0
                                    }}>
                                        {selectedPlace.details.opening_hours.weekday_text.map((hours, index) => (
                                            <li 
                                                key={index}
                                                style={{
                                                    padding: '4px 0',
                                                    borderBottom: index < selectedPlace.details.opening_hours.weekday_text.length - 1 ? 
                                                        '1px solid #eee' : 'none'
                                                }}
                                            >
                                                {hours}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        {/* Website */}
                        {selectedPlace.details.website && (
                            <div style={{ marginBottom: '20px' }}>
                                <a
                                    href={selectedPlace.details.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 16px',
                                        backgroundColor: '#007bff',
                                        color: 'white',
                                        textDecoration: 'none',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                >
                                    🌐 Visit Website
                                </a>
                            </div>
                        )}

                        {/* Price Level */}
                        {selectedPlace.details.price_level && (
                            <div style={{ marginBottom: '16px' }}>
                                <span style={{ color: '#666' }}>
                                    Price Level: {Array(selectedPlace.details.price_level).fill('€').join('')}
                                </span>
                            </div>
                        )}

                        {/* Types/Categories */}
                        {selectedPlace.details.types && (
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '8px',
                                marginBottom: '20px'
                            }}>
                                {selectedPlace.details.types.map((type, index) => (
                                    <span
                                        key={index}
                                        style={{
                                            padding: '4px 12px',
                                            backgroundColor: '#f0f0f0',
                                            borderRadius: '16px',
                                            fontSize: '12px',
                                            color: '#666'
                                        }}
                                    >
                                        {type.replace(/_/g, ' ')}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}