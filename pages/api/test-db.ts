import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/utils/mongodb';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const client = await clientPromise;
        const db = client.db("mobifi"); // Specifically using the mobifi database
        
        // List all collections in the mobifi database
        const collections = await db.listCollections().toArray();
        console.log('Available collections in mobifi:', collections.map(col => col.name));
        
        // Fetch first 10 documents from ratehawk_hotel_dump collection
        const data = await db.collection("ratehawk_hotel_dump")
            .find({})
            .limit(10)
            .toArray();

        res.status(200).json({ 
            message: 'Connection successful',
            database: 'mobifi',
            collection: 'ratehawk_hotel_dump',
            collections: collections.map(col => col.name),
            count: data.length,
            data: data 
        });

    } catch (error) {
        console.error('MongoDB connection error:', error);
        res.status(500).json({ 
            error: 'Failed to connect to database',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
} 