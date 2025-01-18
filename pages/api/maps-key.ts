import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Maps API key not configured' });
    }

    res.status(200).json({ apiKey });
} 