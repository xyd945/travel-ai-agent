// pages/api/places.ts
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * An API route to find place details by name, using Google Places "Find Place From Text".
 * Expects: GET /api/places?placeName=<string>
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // 1. Only allow GET (adjust if you want POST usage)
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed. Use GET.' });
    }

    // 2. Read placeName from query string
    const { placeName } = req.query;
    if (!placeName || typeof placeName !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid placeName parameter' });
    }

    // 3. Grab your Places API key from environment
    //    You can use a private key (not prefixed with NEXT_PUBLIC_) if you want to keep it server-only.
    //    Or if you’ve restricted it to your domain, NEXT_PUBLIC_ is also fine.
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing Google Maps API key in environment' });
    }

    // 4. Set up your fields and URL for the "Find Place From Text" request
    const fields = [
      'place_id',
      'name',
      'formatted_address',
      'geometry/location',
      'photos',
      'types',
    ].join(',');

    const encodedPlaceName = encodeURIComponent(placeName);
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodedPlaceName}&inputtype=textquery&fields=${fields}&key=${apiKey}`;

    console.log('[places.ts] Fetching from:', url);

    // 5. Fetch from the Places API
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[places.ts] Google Places API error:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    // 6. Parse JSON; check for candidates
    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0) {
      console.warn(`[places.ts] No candidates found for "${placeName}"`);
      return res.status(404).json({ error: `No candidates found for "${placeName}"` });
    }

    // 7. Return the first candidate (or the entire array, if you prefer)
    const place = data.candidates[0];
        console.log('[places.ts] Found place:', place.name);
    
        // 8. Send the response
        return res.status(200).json({ place });
      } catch (error) {
        console.error('[places.ts] Unexpected error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
    