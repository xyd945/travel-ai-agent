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
        const { name, city, country_code } = req.body;

        // Normalize strings for comparison
        const normalizeString = (str: string) => {
            return str
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics
                .replace(/[^a-z0-9\s]/g, '')      // Remove special characters
                .trim();
        };

        const client = await clientPromise;
        const db = client.db("mobifi");
        
        // Create text index on region.name if it doesn't exist
        await db.collection("ratehawk_hotel_dump").createIndex({ "region.name": "text" });
        
        // Build the query
        const query: any = {
            "region.type": "City",
        };

        if (country_code) {
            query["region.country_code"] = country_code.toUpperCase();
        }

        if (city) {
            const normalizedCity = normalizeString(city);
            query.$or = [
                { "region.name": { $regex: new RegExp(normalizedCity, 'i') } },
                { "region.name": { $regex: new RegExp(normalizedCity.replace(/\s+/g, ''), 'i') } }
            ];
        }

        if (name) {
            const normalizedName = normalizeString(name);
            query.name = { $regex: new RegExp(normalizedName, 'i') };
        }

        const hotels = await db.collection("ratehawk_hotel_dump")
            .find(query)
            .limit(10)
            .toArray();

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