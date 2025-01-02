// pages/index.tsx
import React, { useState } from 'react';

export default function Home() {
  const [userPrompt, setUserPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState<any>(null);
  const [places, setPlaces] = useState<any[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);

  async function handleSend() {
    setAiResponse(null);
    setPlaces([]);
    try {
      // 1. Call your Next.js API route that calls Gemini
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt })
      });
      const data = await res.json();
      setAiResponse(data);

      // 2. Extract text from AI response
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (!text) return;

      // 3. Find place names in the text
      const extractedPlaces = extractPlaceNames(text);

      // 4. Fetch details for each place using the new `/api/places` endpoint
      setLoadingPlaces(true);
      const placeDetails = [];
      for (const placeName of extractedPlaces) {
        try {
          const res = await fetch(`/api/places?placeName=${encodeURIComponent(placeName)}`);
          if (!res.ok) {
            console.error(`Error fetching place details for ${placeName}`);
            continue;
          }
          const data = await res.json();
          if (data.place) {
            placeDetails.push(data.place);
          }
        } catch (error) {
          console.error(`Error fetching details for ${placeName}:`, error);
        }
      }
      setPlaces(placeDetails);
    } catch (err) {
      console.error(err);
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

      {/* AI raw response */}
      {aiResponse && (
        <div style={{ marginTop: 20 }}>
          <h2>AI Raw Response</h2>
          <pre>{JSON.stringify(aiResponse, null, 2)}</pre>
        </div>
      )}

      {/* Loading spinner or message */}
      {loadingPlaces && <p>Loading place details...</p>}

      {/* Display any Google Places results */}
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
                {/* If there's a photo, build a photo URL using place.photos[0].photo_reference if needed */}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

/**
 * A naive function to parse place names from the AI text.
 * This is just a simple example! You may want more advanced logic or ask AI to return JSON.
 */
function extractPlaceNames(text: string): string[] {
  const lines = text.split('\n').map((line) => line.trim());
  const placeNames: string[] = [];

  for (let line of lines) {
    if (line.startsWith('*') || line.startsWith('-') || line.startsWith('**')) {
      line = line.replace(/^(\*|\-)+\s?/, '').trim();

      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1) {
        line = line.substring(0, colonIndex).trim();
      }

      if (line.length > 0) {
        placeNames.push(line);
      }
    }
  }

  return placeNames;
}
