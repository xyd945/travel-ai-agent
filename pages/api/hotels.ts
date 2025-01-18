import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/utils/mongodb';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { city, country_code } = req.body;

        if (!city) {
            return res.status(400).json({ error: 'City parameter is required' });
        }

        const client = await clientPromise;
        const db = client.db("mobifi");
        
        console.log('Searching for city:', city);

        // Query using the region.name field with collation
        const query: any = {
            "region.type": "City",
            "region.name": city
        };

        if (country_code) {
            query["region.country_code"] = country_code.toUpperCase();
        }

        const hotels = await db.collection("ratehawk_hotel_dump")
            .find(query)
            .collation({ locale: 'en', strength: 2 })  // Case-insensitive matching using collation
            .limit(10)
            .toArray();

        console.log(`Found ${hotels.length} hotels in ${city}`);

        res.status(200).json({
            success: true,
            count: hotels.length,
            hotels
        });

    } catch (error) {
        console.error('MongoDB query error:', error);
        res.status(500).json({
            error: 'Failed to fetch hotels',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
} 