import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    try {
        if (req.method !== 'GET') {
            return res.status(405).json({ error: 'Method not allowed. Use GET.' });
        }

        const { placeName, location } = req.query;
        if (!placeName || typeof placeName !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid placeName parameter' });
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Missing Google Maps API key in environment' });
        }

        const encodedPlaceName = encodeURIComponent(placeName);
        let findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodedPlaceName}&inputtype=textquery&fields=place_id&key=${apiKey}`;

        if (location && typeof location === 'string') { // Type guard
            try {
                //Geocoding the location
                const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`;
                const geocodeResponse = await fetch(geocodeUrl);
                const geocodeData = await geocodeResponse.json();

                if (geocodeData.status === 'OK' && geocodeData.results.length > 0) {
                    const { lat, lng } = geocodeData.results[0].geometry.location;
                    const locationBias = `${lat},${lng}`;
                    findPlaceUrl += `&location=${locationBias}`;
                    console.log("Geocoding success, location bias set to:", locationBias);
                } else {
                    console.warn("Geocoding failed for:", location, geocodeData.status, geocodeData); // Log geocoding response
                }
            } catch (geocodeError) {
                console.error("Error during geocoding:", geocodeError);
            }
        } else {
            console.warn("No location provided or invalid location format.");
        }

        console.log('[places.ts] Find Place URL:', findPlaceUrl);

        const findPlaceResponse = await fetch(findPlaceUrl);
        if (!findPlaceResponse.ok) {
            const errorText = await findPlaceResponse.text();
            console.error('[places.ts] Google Places API (Find Place) error:', findPlaceResponse.status, errorText);
            return res.status(findPlaceResponse.status).json({ error: errorText });
        }

        const findPlaceData = await findPlaceResponse.json();

        if (!findPlaceData.candidates || findPlaceData.candidates.length === 0) {
            console.warn(`[places.ts] No candidates found for "${placeName}"`);
            return res.status(404).json({ error: `No candidates found for "${placeName}"` });
        }

        const placeId = findPlaceData.candidates[0].place_id;

        if (!placeId) {
            return res.status(500).json({ error: 'Place ID not found in Find Place response' });
        }

        const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,photos,rating,website,formatted_phone_number,opening_hours&key=${apiKey}`;

        console.log('[places.ts] Place Details URL:', placeDetailsUrl);

        const placeDetailsResponse = await fetch(placeDetailsUrl);
        if (!placeDetailsResponse.ok) {
            const errorText = await placeDetailsResponse.text();
            console.error('[places.ts] Google Places API (Place Details) error:', placeDetailsResponse.status, errorText);
            return res.status(placeDetailsResponse.status).json({ error: errorText });
        }

        const placeDetailsData = await placeDetailsResponse.json();

        if (placeDetailsData.status !== 'OK') {
            console.error('[places.ts] Place Details API returned status:', placeDetailsData.status, placeDetailsData); // Log full details response
            return res.status(500).json({ error: `Place Details API error: ${placeDetailsData.status}` });
        }

        res.status(200).json({ place: placeDetailsData.result });

    } catch (error: any) {
        console.error('[places.ts] Overall error:', error);
        return res.status(500).json({ error: error.message });
    }
}