import React, { useState } from 'react';

export default function Home() {
    const [userPrompt, setUserPrompt] = useState('');
    const [aiResponse, setAiResponse] = useState<any>(null);
    const [places, setPlaces] = useState<any[]>([]);
    const [loadingPlaces, setLoadingPlaces] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    async function handleSend() {
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
            } else {
                console.log("No places of interest found.")
            }

        } catch (err) {
            console.error("Overall error:", err);
        } finally {
            setLoadingPlaces(false);
        }
    }

    return (
        <main style={{ padding: 20 }}>
            <h1>Gemini AI Test</h1>
            <input
                type="text"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Ask about travel destinations..."
                style={{ width: 300, marginRight: 10 }}
            />
            <button onClick={handleSend}>Send</button>

            {aiError && <p style={{ color: 'red' }}>{aiError}</p>}

            {aiResponse && (
                <div style={{ marginTop: 20 }}>
                    <h2>AI Response</h2>
                    <pre>{JSON.stringify(aiResponse, null, 2)}</pre>
                </div>
            )}

            {loadingPlaces && <p>Loading place details...</p>}

            {places.length > 0 && (
                <div style={{ marginTop: 20 }}>
                    <h2>Places Info from Google Maps</h2>
                    <ul>
                        {places.map((place, idx) => (
                            <li key={idx} style={{ marginBottom: 20 }}>
                                <strong>{place.name}</strong>
                                <br />
                                {place.formatted_address}
                                {place.geometry && (
                                    <div>
                                        Lat: {place.geometry.location.lat}, Lng: {place.geometry.location.lng}
                                    </div>
                                )}
                                {place.photos && place.photos.length > 0 && (
                                    <img
                                        src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                                        alt={`Photo of ${place.name}`}
                                    />
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </main>
    );
}