// pages/api/ai.ts
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * This endpoint calls Google AI Studio (Gemini) to generate content.
 * It expects a POST request with JSON body: { userPrompt: string }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userPrompt } = req.body;

  if (!userPrompt) {
    return res.status(400).json({ error: 'Missing "userPrompt" in request body' });
  }

  try {
    // Get the API key from server-side environment
    const GOOGLE_AI_STUDIO_API_KEY = process.env.GOOGLE_AI_STUDIO_API_KEY;
    if (!GOOGLE_AI_STUDIO_API_KEY) {
      throw new Error('GOOGLE_AI_STUDIO_API_KEY is missing in environment variables');
    }

    // Build the URL with your Gemini API key
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_AI_STUDIO_API_KEY}`;

    // Build the request payload
    const payload = {
      contents: [
        {
          parts: [
            {
              text: userPrompt
            }
          ]
        }
      ]
    };

    // Make the POST request using fetch (built into Node 18+ or Next.js runtime)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // Convert the response to JSON
    const data = await response.json();

    // Optionally, handle error states returned by the API
    if (!response.ok) {
      console.error('Gemini API error:', data);
      return res.status(response.status).json({ error: data });
    }

    // Success: return the API’s response to the client
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Error calling Gemini:', error);
    return res.status(500).json({ error: error.message });
  }
}
