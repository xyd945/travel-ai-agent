import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Add CORS headers if needed
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST method
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { places, location } = req.body;

    try {
        const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
        if (!GOOGLE_MAPS_API_KEY) {
            throw new Error('Google Maps API key is missing');
        }

        // Fetch details for each place
        const placeDetails = await Promise.all(places.map(async (place: any) => {
            try {
                const searchQuery = `${place.name} ${location}`;
                const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${GOOGLE_MAPS_API_KEY}`;
                
                const searchRes = await fetch(searchUrl);
                const searchData = await searchRes.json();

                if (searchData.results && searchData.results[0]) {
                    const placeId = searchData.results[0].place_id;
                    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,photos,rating,website,formatted_phone_number,opening_hours,types,price_level,user_ratings_total&key=${GOOGLE_MAPS_API_KEY}`;
                    
                    const detailsRes = await fetch(detailsUrl);
                    const detailsData = await detailsRes.json();

                    if (detailsData.result) {
                        return detailsData.result;
                    }
                }
                return null;
            } catch (error) {
                console.error('Error fetching place details:', error);
                return null;
            }
        }));

        // Filter out null results
        const validPlaces = placeDetails.filter(place => place !== null);
        
        // Send response
        res.status(200).json(validPlaces);

    } catch (error) {
        console.error('Error in places API:', error);
        res.status(500).json({ error: 'Failed to fetch place details' });
    }
}